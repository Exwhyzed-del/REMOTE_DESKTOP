import { useState, useEffect } from "react";
import { 
  Tv, Cpu, ShieldAlert, Wifi, Activity, Terminal as TermIcon, 
  Settings, HelpCircle, RefreshCw, X, LogOut, CheckCircle, 
  AlertTriangle, Lock, Eye, Minimize, Maximize, Play, Square, Laptop 
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
import { PerformanceHUD } from "./components/PerformanceHUD";

export default function App() {
  // --- STATE PERSISTENCE ---
  const [deviceId, setDeviceId] = useState<string>("");
  const [securityPassword, setSecurityPassword] = useState<string>("123456");

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

  const handlePasswordChange = (newPass: string) => {
    setSecurityPassword(newPass);
    localStorage.setItem("remote_desktop_access_password", newPass);
  };

  const handleResetDeviceId = () => {
    const digits = Math.floor(100000000 + Math.random() * 900000000).toString();
    localStorage.setItem("remote_desktop_device_id", digits);
    setDeviceId(digits);
    setLogs((prev) => [...prev, `[System] Device ID regenerated: ${digits}`]);
  };

  // --- CONNECTING & HANDSHAKING STATES ---
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [targetId, setTargetId] = useState<string>("");
  const [sessionKey, setSessionKey] = useState<string>("");
  const [replayToken, setReplayToken] = useState<string>("");

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
    "[System] Local C++ signaling daemon initialized.",
    "[System] Listening securely on ports (TCP 3000, UDP 3001)...",
  ]);

  // Adjust metrics in response to network preset updates
  useEffect(() => {
    setMetrics((prev) => {
      let lat = 2;
      let loss = 0;
      let targetFps = 60;
      let hw = isHardwareEncoding;

      if (networkPreset === NetworkPreset.LAN) {
        lat = Math.floor(Math.random() * 2) + 2; // 2-3ms
        loss = 0.0;
        targetFps = 60;
      } else if (networkPreset === NetworkPreset.WAN_4G) {
        lat = Math.floor(Math.random() * 15) + 35; // 35-50ms
        loss = 0.1;
        targetFps = 30;
      } else if (networkPreset === NetworkPreset.WAN_3G) {
        lat = Math.floor(Math.random() * 30) + 120; // 120-150ms
        loss = 1.2;
        targetFps = 15;
        hw = false; // standard software fallback on poor link
      } else if (networkPreset === NetworkPreset.BAD_CONNECTION) {
        lat = Math.floor(Math.random() * 40) + 80; // 80-120ms
        loss = 6.4; // 6.4% packet loss
        targetFps = 30;
      }

      return {
        ...prev,
        latency: lat,
        packetLoss: loss,
        fps: targetFps,
        hardwareEncoding: hw,
      };
    });
  }, [networkPreset, isHardwareEncoding]);

  // Heartbeat loop & background metrics fluctuation
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      setMetrics((prev) => {
        if (connectionStatus !== ConnectionStatus.CONNECTED && activeTab !== "splitscreen") {
          return prev;
        }

        // Add minor latency jitter
        const baseLatency = prev.latency;
        const jitter = Math.sin(Date.now() / 3000) * (baseLatency * 0.15);
        const finalLatency = Math.max(1, baseLatency + jitter);

        // Fluctuate compression and packets
        const randomSent = Math.floor(Math.random() * 15) + 10;
        const total = prev.totalPacketsSent + randomSent;

        return {
          ...prev,
          latency: Number(finalLatency.toFixed(1)),
          totalPacketsSent: total,
        };
      });
    }, 1200);

    return () => clearInterval(metricsInterval);
  }, [connectionStatus, activeTab]);

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
        setLogs((prev) => [...prev, "[Security] Authentication lockout period expired. Retry allowed."]);
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
          // Perform log clear operation (simulates clearing log file safely every 20s)
          setLogs([
            `[Security] Secure log purge: Active background daemon event log auto-cleared securely (20s timer triggered).`,
            `[System] Background listening daemon active (TCP 3000, UDP 3001)...`
          ]);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoClearLogs]);

  // --- CONNECTION INITIATION HANDLERS ---
  const handleConnectRequest = (remoteId: string, remotePass: string) => {
    // Check lockouts
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setConnectionStatus(ConnectionStatus.LOCKED_OUT);
      return;
    }

    setTargetId(remoteId);
    setConnectionStatus(ConnectionStatus.CONNECTING);
    setLogs((prev) => [...prev, `[Connection] Requesting secure link to: ${remoteId}...`]);

    // Password verification with rate limiter (default: "123456")
    setTimeout(() => {
      setConnectionStatus(ConnectionStatus.VERIFYING);
      
      const onFailed = (attempts: number, lockoutSeconds: number | null) => {
        setFailedAttempts(attempts);
        setLogs((prev) => [...prev, `[Security] Failed auth attempt #${attempts} with invalid password!`]);
        
        if (lockoutSeconds) {
          const timeout = Date.now() + lockoutSeconds * 1000;
          setLockoutUntil(timeout);
          setLockoutRemaining(lockoutSeconds);
          setConnectionStatus(ConnectionStatus.LOCKED_OUT);
        } else {
          setConnectionStatus(ConnectionStatus.IDLE);
        }
      };

      const onSuccess = () => {
        const key = generateSessionKey();
        const nonce = generateReplayToken();
        setSessionKey(key);
        setReplayToken(nonce);
        setFailedAttempts(0);
        setConnectionStatus(ConnectionStatus.HANDSHAKE);
      };

      verifyConnectionPassword(remotePass, securityPassword, { failedAttempts, lockoutUntil }, onFailed, onSuccess);
    }, 1000);
  };

  const handleHandshakeComplete = () => {
    setConnectionStatus(ConnectionStatus.CONNECTED);
    setActiveTab("session");
    setLogs((prev) => [...prev, `[System] Secure connection active to ${targetId}. Session AES key established.`]);
  };

  const handleDisconnect = () => {
    setConnectionStatus(ConnectionStatus.IDLE);
    setLogs((prev) => [...prev, `[Connection] Remote host connection closed by user.`]);
    if (activeTab === "session") {
      setActiveTab("dash");
    }
  };

  // --- REMOTE INPUT EVENTS LOGGER ---
  const handleInputEvent = (
    type: "click" | "move" | "keydown" | "scroll" | "drag",
    detail: string,
    dataSize: number
  ) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logId = Date.now() + Math.random().toString();
    
    setInputLogs((prev) => [
      { id: logId, type, detail, timestamp, networkSize: dataSize },
      ...prev.slice(0, 14), // keep last 15 inputs
    ]);

    // Also pipe directly into core connection log for diagnostic visualization
    if (type !== "move" && Math.random() < 0.4) {
      setLogs((prev) => [
        ...prev,
        `[TCP Control] Input payload serialized: ${type.toUpperCase()} [${detail}] (${dataSize} bytes)`
      ]);
    }
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
              RustDesk Lite
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                C++20 v1.4
              </span>
            </h1>
            <p className="text-[10px] font-mono text-slate-500">
              Low-Latency Remote Desktop Engine // Boost.Asio // DXGI Desktop Duplicator
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
            Interactive Splitscreen Lab
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
              Connected Session
            </button>
          )}
        </div>
      </header>

      {/* Main Content Workspace Layout with Sleek radial gradient */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[radial-gradient(circle_at_top_right,_#14161F_0%,_#0A0B0E_60%)]">
        
        {/* Connection Loader Console (Handshaking stage) */}
        {(connectionStatus === ConnectionStatus.CONNECTING || 
          connectionStatus === ConnectionStatus.VERIFYING || 
          connectionStatus === ConnectionStatus.HANDSHAKE) && (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <HandshakeConsole
              remoteDeviceId={targetId}
              sessionKey={sessionKey}
              replayToken={replayToken}
              networkPreset={networkPreset}
              onComplete={handleHandshakeComplete}
              onCancel={handleDisconnect}
            />
          </div>
        )}

        {/* Tab 1: Connection Desk (Default configuration view) */}
        {activeTab === "dash" && 
         connectionStatus !== ConnectionStatus.CONNECTING && 
         connectionStatus !== ConnectionStatus.VERIFYING && 
         connectionStatus !== ConnectionStatus.HANDSHAKE && (
          <div className="space-y-6">
            
            {/* Split layout: Dashboard and quick settings panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Core Controller Dashboard panel */}
              <div className="lg:col-span-2">
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
                  <TermIcon size={14} className="text-indigo-400" /> Daemon Event Logs
                </span>
                <span className="text-[10px] font-mono text-slate-500">Listening on 0.0.0.0</span>
              </div>
              <div className="bg-slate-950 border border-slate-900/80 rounded-lg p-3.5 h-36 overflow-y-auto text-[10px] font-mono space-y-1.5 text-slate-400 scrollbar-thin scrollbar-thumb-slate-800">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 leading-relaxed">
                    <span className="text-slate-700 select-none">{new Date().toLocaleTimeString()}</span>
                    <span className={log.includes("[Security]") ? "text-cyan-400" : log.includes("[TCP Control]") ? "text-indigo-400/80" : "text-slate-400"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Splitscreen Lab (The absolute ultimate showcase) */}
        {activeTab === "splitscreen" && (
          <div className="space-y-6">
            
            {/* Educational header */}
            <div className="bg-indigo-950/20 border border-indigo-900/50 p-4 rounded-xl text-xs space-y-1 text-slate-300 max-w-7xl mx-auto">
              <h2 className="font-bold text-sm text-indigo-300 flex items-center gap-1">
                <Cpu size={15} /> Real-Time Remote Loop Simulator
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Interact with the **Local Workspace Controller** below. Mouse coordinates, clicks, drags, and keystrokes are instantly marshaled, encrypted using **AES-256-GCM**, and pushed over a simulated TCP channel to the **Remote Target Workstation** (Right Monitor). You will literally see the remote viewport receive inputs and trigger DirectX DXGI Desktop Duplication dirty rectangles overlays on changed regions!
              </p>
            </div>

            {/* Splitscreen grid panel */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto items-start">
              
              {/* Left Column: Input Controller */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                    <Laptop size={14} className="text-indigo-400 animate-pulse" /> LOCAL VIEW CONTROLLER (FEED: {targetId || "813-524-901"})
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-slate-500">RTT:</span>
                    <span className="text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{metrics.latency} ms</span>
                  </div>
                </div>

                {captureMode === CaptureMode.VIRTUAL_OS ? (
                  <VirtualOS
                    controlMode={controlMode}
                    networkPreset={networkPreset}
                    onInputEvent={handleInputEvent}
                    latencyMs={metrics.latency}
                  />
                ) : (
                  <RealScreenShare
                    onMetricsUpdate={setMetrics}
                    onInputEvent={handleInputEvent}
                  />
                )}
              </div>

              {/* Right Column: Live Network Packets Stream + Stats HUD */}
              <div className="xl:col-span-1 space-y-4">
                
                {/* Diagnostics performance HUD */}
                <PerformanceHUD
                  metrics={metrics}
                  sessionKey={sessionKey || "AES_256_GCM_SIMULATED_HANDSHAKE_SESSION_KEY"}
                  isRealScreen={captureMode === CaptureMode.REAL_SCREEN}
                />

                {/* Packet stream logger */}
                <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex flex-col space-y-3 shadow-xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold font-mono uppercase text-slate-400">
                      Live Control Packets Stream (TCP)
                    </span>
                    <span className="text-[9px] bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded font-mono border border-indigo-500/20">
                      SECURE
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 h-48 overflow-y-auto text-[10px] font-mono space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {inputLogs.length === 0 ? (
                      <p className="text-slate-600 text-center pt-16">
                        No control packets dispatched. Move your mouse or click keys in the Workspace left view to stream packets!
                      </p>
                    ) : (
                      inputLogs.map((log) => (
                        <div key={log.id} className="flex flex-col gap-0.5 border-b border-slate-900/60 pb-1 animate-fade-in text-slate-400">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-indigo-400 font-bold uppercase tracking-wider">{log.type}</span>
                            <span className="text-slate-600">{log.timestamp}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>{log.detail}</span>
                            <span className="text-emerald-500 font-bold">+{log.networkSize} Bytes</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="text-[9px] text-slate-500 leading-normal bg-slate-950/60 p-2.5 rounded border border-slate-800 font-mono">
                    Note: Inputs trigger instant TCP serialization. Real-time screen frame encoding pushes compressed frames back over secure UDP payload sockets.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Connected Session (Full view immersive layout) */}
        {activeTab === "session" && connectionStatus === ConnectionStatus.CONNECTED && (
          <div className="max-w-6xl mx-auto space-y-4">
            
            {/* Immersive session control header toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap justify-between items-center gap-3 shadow-lg px-5">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold font-mono tracking-wider text-slate-300">
                  SESSION CONTROLLER FOR DEVICE: {targetId}
                </span>
              </div>

              {/* Micro diagnostic values overlay */}
              <div className="flex items-center gap-5 text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800/80 px-3 py-1.5 rounded-lg">
                <span className="flex items-center gap-1">FPS: <span className="text-emerald-400 font-bold">{metrics.fps}</span></span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1">RTT: <span className="text-cyan-400 font-bold">{metrics.latency}ms</span></span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1">Bitrate: <span className="text-amber-400 font-bold">{metrics.bitrate} Mbps</span></span>
              </div>

              {/* toolbar control action triggers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const mode = controlMode === ControlMode.FULL_CONTROL ? ControlMode.VIEW_ONLY : ControlMode.FULL_CONTROL;
                    setControlMode(mode);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {controlMode === ControlMode.FULL_CONTROL ? (
                    <span className="text-emerald-400 flex items-center gap-1">● Control Mode</span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1"><Lock size={12} /> View Only</span>
                  )}
                </button>

                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow"
                >
                  <LogOut size={12} /> Abort Connection
                </button>
              </div>
            </div>

            {/* Immersive View Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Primary Duplicated screen canvas */}
              <div className="lg:col-span-2">
                {captureMode === CaptureMode.VIRTUAL_OS ? (
                  <VirtualOS
                    controlMode={controlMode}
                    networkPreset={networkPreset}
                    onInputEvent={handleInputEvent}
                    latencyMs={metrics.latency}
                  />
                ) : (
                  <RealScreenShare
                    onMetricsUpdate={setMetrics}
                    onInputEvent={handleInputEvent}
                  />
                )}
              </div>

              {/* Performance Diagnostics widgets */}
              <div className="lg:col-span-1">
                <PerformanceHUD
                  metrics={metrics}
                  sessionKey={sessionKey}
                  isRealScreen={captureMode === CaptureMode.REAL_SCREEN}
                />
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Humble Footer */}
      <footer className="bg-[#08090C] border-t border-slate-900 py-3 text-center text-[10px] font-mono text-slate-500 shrink-0">
        RustDesk Lite Web Companion • Secure Ephemeral TLS 1.3 Handshake • AES-256-GCM Cryptographic Channel
      </footer>
    </div>
  );
}
