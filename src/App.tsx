import { useState, useEffect, useRef } from "react";
import { 
  Tv, Cpu, ShieldAlert, Wifi, Activity, Terminal as TermIcon, 
  Settings, HelpCircle, RefreshCw, X, LogOut, CheckCircle, 
  AlertTriangle, Lock, Eye, Minimize, Maximize, Play, Square, Laptop, Users 
} from "lucide-react";

import { 
  ConnectionStatus, NetworkPreset, ColorDepth, 
  ControlMode, CaptureMode, NetworkMetrics, InputEventLog 
} from "./types";
import { generateSessionKey, generateReplayToken, verifyConnectionPassword } from "./utils/security";
import { Dashboard } from "./components/Dashboard";
import { SettingsPanel } from "./components/SettingsPanel";
import { HandshakeConsole } from "./components/HandshakeConsole";
import { VirtualOS } from "./components/VirtualOS";
import { RealScreenShare } from "./components/RealScreenShare";
import { RemoteScreenViewer } from "./components/RemoteScreenViewer";
import { PerformanceHUD } from "./components/PerformanceHUD";
import { WebRTCManager } from "./utils/webrtc";

export default function App() {
  // --- STATE PERSISTENCE ---
  const [deviceId, setDeviceId] = useState<string>("");
  const [securityPassword, setSecurityPassword] = useState<string>("123456");
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const [peerList, setPeerList] = useState<string[]>([]);

  // Load / initialize Device ID and credentials
  useEffect(() => {
    let cachedId = localStorage.getItem("remote_desktop_device_id");
    if (!cachedId) {
      // Generate unique random 9-digit Device ID on first launch
      const digits = Math.floor(100000000 + Math.random() * 900000000).toString();
      localStorage.setItem("remote_desktop_device_id", digits);
      cachedId = digits;
    }
    setDeviceId(cachedId);

    const cachedPass = localStorage.getItem("remote_desktop_access_password");
    if (cachedPass) {
      setSecurityPassword(cachedPass);
    }
  }, []);

  // Initialize WebRTC manager
  useEffect(() => {
    if (!deviceId) return;

    webrtcManagerRef.current = new WebRTCManager({
      deviceId,
      onConnect: () => {
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setActiveTab("session");
        addLog(`[System] Secure WebRTC connection active to ${targetId}`);
      },
      onDisconnect: () => {
        setConnectionStatus(ConnectionStatus.IDLE);
        addLog(`[Connection] Peer disconnected`);
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onDataChannelMessage: (data) => {
        handleRemoteInput(data);
      },
      onPeerList: (peers) => {
        setPeerList(peers.filter(p => p !== deviceId));
      }
    });

    webrtcManagerRef.current.initialize();

    return () => {
      webrtcManagerRef.current?.destroy();
    };
  }, [deviceId]);

  const handlePasswordChange = (newPass: string) => {
    setSecurityPassword(newPass);
    localStorage.setItem("remote_desktop_access_password", newPass);
  };

  const handleResetDeviceId = () => {
    const digits = Math.floor(100000000 + Math.random() * 900000000).toString();
    localStorage.setItem("remote_desktop_device_id", digits);
    setDeviceId(digits);
    addLog(`[System] Device ID regenerated: ${digits}`);
  };

  // --- CONNECTING & HANDSHAKING STATES ---
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [targetId, setTargetId] = useState<string>("");
  const [sessionKey, setSessionKey] = useState<string>("");
  const [replayToken, setReplayToken] = useState<string>("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Rate Limiting Security configuration
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Active View tabs
  const [activeTab, setActiveTab] = useState<"dash" | "splitscreen" | "session">("dash");
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Engine Preferences
  const [networkPreset, setNetworkPreset] = useState<NetworkPreset>(NetworkPreset.LAN);
  const [colorDepth, setColorDepth] = useState<ColorDepth>(ColorDepth.DEPTH_24BIT);
  const [controlMode, setControlMode] = useState<ControlMode>(ControlMode.FULL_CONTROL);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(CaptureMode.VIRTUAL_OS);
  const [isHardwareEncoding, setIsHardwareEncoding] = useState<boolean>(true);

  // --- METRICS & NETWORKING LOGS ---
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    fps: 60,
    latency: 2,
    bitrate: 1.25,
    packetLoss: 0.0,
    dirtyRectsCount: 1,
    totalPacketsSent: 150,
    hardwareEncoding: true,
    compressionRatio: 22.4,
  });

  const [inputLogs, setInputLogs] = useState<InputEventLog[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "[System] WebRTC signaling server initialized.",
    "[System] Listening for peer connections...",
  ]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      
      if (remaining === 0) {
        setLockoutUntil(null);
        setConnectionStatus(ConnectionStatus.IDLE);
        setFailedAttempts(0);
        addLog("[Security] Authentication lockout period expired. Retry allowed.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // --- BACKGROUND & SECURE AUTO-CLEAR LOGS STATES & EFFECTS ---
  const [autoClearLogs, setAutoClearLogs] = useState<boolean>(true);
  const [nextClearCountdown, setNextClearCountdown] = useState<number>(20);
  const [unattendedAccess, setUnattendedAccess] = useState<boolean>(true);
  const [runInBackground, setRunInBackground] = useState<boolean>(true);

  // Auto-clear logs every 20 seconds
  useEffect(() => {
    if (!autoClearLogs) return;

    const timer = setInterval(() => {
      setNextClearCountdown((prev) => {
        if (prev <= 1) {
          // Perform log clear operation
          setLogs([
            `[Security] Secure log purge: Event log auto-cleared (20s timer triggered).`,
            `[System] WebRTC daemon active...`
          ]);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoClearLogs]);

  // --- CONNECTION INITIATION HANDLERS ---
  const handleConnectRequest = async (remoteId: string, remotePass: string) => {
    // Check lockouts
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setConnectionStatus(ConnectionStatus.LOCKED_OUT);
      return;
    }

    setTargetId(remoteId);
    setConnectionStatus(ConnectionStatus.CONNECTING);
    addLog(`[Connection] Requesting secure WebRTC link to: ${remoteId}...`);

    // Password verification
    setTimeout(() => {
      setConnectionStatus(ConnectionStatus.VERIFYING);
      
      const onFailed = (attempts: number, lockoutSeconds: number | null) => {
        setFailedAttempts(attempts);
        addLog(`[Security] Failed auth attempt #${attempts} with invalid password!`);
        
        if (lockoutSeconds) {
          const timeout = Date.now() + lockoutSeconds * 1000;
          setLockoutUntil(timeout);
          setLockoutRemaining(lockoutSeconds);
          setConnectionStatus(ConnectionStatus.LOCKED_OUT);
        } else {
          setConnectionStatus(ConnectionStatus.IDLE);
        }
      };

      const onSuccess = async () => {
        const key = generateSessionKey();
        const nonce = generateReplayToken();
        setSessionKey(key);
        setReplayToken(nonce);
        setFailedAttempts(0);
        setConnectionStatus(ConnectionStatus.HANDSHAKE);
        
        // Start real WebRTC connection
        await webrtcManagerRef.current?.connectToPeer(remoteId);
      };

      verifyConnectionPassword(remotePass, securityPassword, { failedAttempts, lockoutUntil }, onFailed, onSuccess);
    }, 500);
  };

  const handleHandshakeComplete = () => {
    // Already handled by WebRTC onConnect
  };

  const handleDisconnect = () => {
    webrtcManagerRef.current?.disconnect();
    setConnectionStatus(ConnectionStatus.IDLE);
    setRemoteStream(null);
    addLog(`[Connection] Connection closed by user.`);
    if (activeTab === "session") {
      setActiveTab("dash");
    }
  };

  // --- REMOTE INPUT EVENTS HANDLERS ---
  const handleInputEvent = (
    type: "click" | "move" | "keydown" | "scroll" | "drag",
    detail: string,
    dataSize: number
  ) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logId = Date.now() + Math.random().toString();
    
    setInputLogs((prev) => [
      { id: logId, type, detail, timestamp, networkSize: dataSize },
      ...prev.slice(0, 14),
    ]);

    if (type !== "move" && Math.random() < 0.4) {
      addLog(`[Data Channel] Input payload sent: ${type.toUpperCase()}`);
    }
  };

  // Handle input from remote peer
  const handleRemoteInput = (data: any) => {
    console.log('Remote input:', data);
    // Here you would handle remote input simulation
  };

  // Send local input to remote peer
  const sendInputToRemote = (event: any) => {
    webrtcManagerRef.current?.sendData(event);
    handleInputEvent(
      event.type as any,
      JSON.stringify(event),
      JSON.stringify(event).length
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-300 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Top Professional App Header */}
      <header className="bg-[#111318] border-b border-slate-800/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 text-white">
            <Tv className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold tracking-wider uppercase flex items-center gap-2 text-slate-100">
              WebRTC Remote Desktop
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                v2.0 Real
              </span>
            </h1>
            <p className="text-[10px] font-mono text-slate-500">
              Low-Latency WebRTC // Peer-to-Peer // Screen Sharing
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#050608] p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab("dash")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeTab === "dash" 
                ? "bg-[#161920] text-slate-100 border border-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Connection Desk
          </button>
          
          <button
            onClick={() => {
              setActiveTab("splitscreen");
              setShowSettings(false);
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeTab === "splitscreen" 
                ? "bg-[#161920] text-slate-100 border border-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Share Your Screen
          </button>

          {connectionStatus === ConnectionStatus.CONNECTED && (
            <button
              onClick={() => {
                setActiveTab("session");
                setShowSettings(false);
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 text-emerald-400 ${
                activeTab === "session" 
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/40 shadow-sm" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Connected
            </button>
          )}
        </div>
      </header>

      {/* Main Content Workspace Layout */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[radial-gradient(circle_at_top_right,_#14161F_0%,_#0A0B0E_60%)]">
        
        {/* Connection Loader Console */}
        {(connectionStatus === ConnectionStatus.CONNECTING || 
          connectionStatus === ConnectionStatus.VERIFYING || 
          connectionStatus === ConnectionStatus.HANDSHAKE) && (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <HandshakeConsole
              remoteDeviceId={targetId}
              sessionKey={sessionKey}
              replayToken={replayToken}
              networkPreset={networkPreset}
              onComplete={() => {}}
              onCancel={handleDisconnect}
            />
          </div>
        )}

        {/* Tab 1: Connection Desk */}
        {activeTab === "dash" && 
         connectionStatus !== ConnectionStatus.CONNECTING && 
         connectionStatus !== ConnectionStatus.VERIFYING && 
         connectionStatus !== ConnectionStatus.HANDSHAKE && (
          <div className="space-y-6">
            
            {/* Split layout: Dashboard and quick settings panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Core Controller Dashboard panel */}
              <div className="lg:col-span-2 space-y-4">
                <Dashboard
                  deviceId={deviceId}
                  securityPassword={securityPassword}
                  onConnect={handleConnectRequest}
                  connectionStatus={connectionStatus}
                  failedAttempts={failedAttempts}
                  lockoutRemaining={lockoutRemaining}
                  onOpenSettings={() => setShowSettings(!showSettings)}
                  autoClearLogs={autoClearLogs}
                  onAutoClearLogsChange={setAutoClearLogs}
                  nextClearCountdown={nextClearCountdown}
                  unattendedAccess={unattendedAccess}
                  onUnattendedAccessChange={setUnattendedAccess}
                  runInBackground={runInBackground}
                  onRunInBackgroundChange={setRunInBackground}
                />

                {/* Peer List */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-400" /> Available Peers
                    </span>
                  </div>
                  <div className="space-y-2">
                    {peerList.length === 0 ? (
                      <p className="text-slate-600 text-sm text-center py-4">
                        No other peers online yet. Share your device ID!
                      </p>
                    ) : (
                      peerList.map((peer) => (
                        <div key={peer} className="flex justify-between items-center bg-slate-950 rounded-lg p-3 border border-slate-800">
                          <span className="text-sm font-mono text-slate-300">{peer}</span>
                          <button
                            onClick={() => handleConnectRequest(peer, securityPassword)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-all"
                          >
                            Connect
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Controls & Settings column */}
              <div className="lg:col-span-1">
                <SettingsPanel
                  currentPassword={securityPassword}
                  onPasswordChange={handlePasswordChange}
                  networkPreset={networkPreset}
                  onNetworkPresetChange={setNetworkPreset}
                  colorDepth={colorDepth}
                  onColorDepthChange={setColorDepth}
                  controlMode={controlMode}
                  onControlModeChange={setControlMode}
                  captureMode={captureMode}
                  onCaptureModeChange={setCaptureMode}
                  onResetDeviceId={handleResetDeviceId}
                  isHardwareEncoding={isHardwareEncoding}
                  onToggleHardwareEncoding={() => setIsHardwareEncoding(!isHardwareEncoding)}
                />
              </div>
            </div>

            {/* Diagnostic Logs Panel at bottom */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <TermIcon size={14} className="text-indigo-400" /> Event Logs
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-900/80 rounded-lg p-3.5 h-36 overflow-y-auto text-[10px] font-mono space-y-1.5 text-slate-400 scrollbar-thin scrollbar-thumb-slate-800">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 leading-relaxed">
                    <span className="text-slate-700 select-none">{new Date().toLocaleTimeString()}</span>
                    <span className={log.includes("[Security]") ? "text-cyan-400" : log.includes("[Data Channel]") ? "text-indigo-400/80" : "text-slate-400"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Share Your Screen */}
        {activeTab === "splitscreen" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-indigo-950/20 border border-indigo-900/50 p-4 rounded-xl text-xs space-y-1 text-slate-300">
              <h2 className="font-bold text-sm text-indigo-300 flex items-center gap-1">
                <Cpu size={15} /> Share Your Screen
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Start sharing your screen so connected peers can view and control your desktop!
              </p>
            </div>

            <RealScreenShare
              onMetricsUpdate={(updater) => {
                if (typeof updater === 'function') {
                  setMetrics(updater);
                }
              }}
              onInputEvent={handleInputEvent}
              onStreamReady={(stream) => {
                webrtcManagerRef.current?.setLocalStream(stream);
              }}
            />
          </div>
        )}

        {/* Tab 3: Connected Session */}
        {activeTab === "session" && connectionStatus === ConnectionStatus.CONNECTED && (
          <div className="max-w-6xl mx-auto space-y-4">
            
            {/* Session control header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap justify-between items-center gap-3 shadow-lg px-5">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold font-mono tracking-wider text-slate-300">
                  REMOTE SESSION: {targetId}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const mode = controlMode === ControlMode.FULL_CONTROL ? ControlMode.VIEW_ONLY : ControlMode.FULL_CONTROL;
                    setControlMode(mode);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {controlMode === ControlMode.FULL_CONTROL ? (
                    <span className="text-emerald-400 flex items-center gap-1">Control Mode</span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1"><Lock size={12} /> View Only</span>
                  )}
                </button>

                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow"
                >
                  <LogOut size={12} /> Disconnect
                </button>
              </div>
            </div>

            {/* View Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Remote Screen */}
              <div className="lg:col-span-2">
                <RemoteScreenViewer
                  stream={remoteStream}
                  onInputEvent={controlMode === ControlMode.FULL_CONTROL ? sendInputToRemote : undefined}
                />
              </div>

              {/* Performance HUD */}
              <div className="lg:col-span-1">
                <PerformanceHUD
                  metrics={metrics}
                  sessionKey={sessionKey}
                  isRealScreen={true}
                />
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="bg-[#08090C] border-t border-slate-900 py-3 text-center text-[10px] font-mono text-slate-500 shrink-0">
        WebRTC Remote Desktop // Peer-to-Peer // Low Latency
      </footer>
    </div>
  );
}
