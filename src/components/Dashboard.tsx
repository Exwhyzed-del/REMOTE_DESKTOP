import React, { useState } from "react";
import { 
  Laptop, Shield, ArrowRight, Clipboard, ClipboardCheck, 
  Settings, History, Smartphone, HelpCircle, Check, X, LogIn,
  Terminal, RefreshCw, Download, Activity
} from "lucide-react";
import { ConnectionStatus, RecentSession } from "../types";

interface DashboardProps {
  deviceId: string;
  securityPassword: string;
  onConnect: (remoteId: string, remotePass: string) => void;
  connectionStatus: ConnectionStatus;
  failedAttempts: number;
  lockoutRemaining: number; // in seconds
  onOpenSettings: () => void;
  
  // Standalone App / Daemon props
  autoClearLogs: boolean;
  onAutoClearLogsChange: (val: boolean) => void;
  nextClearCountdown: number;
  unattendedAccess: boolean;
  onUnattendedAccessChange: (val: boolean) => void;
  runInBackground: boolean;
  onRunInBackgroundChange: (val: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  deviceId,
  securityPassword,
  onConnect,
  connectionStatus,
  failedAttempts,
  lockoutRemaining,
  onOpenSettings,
  autoClearLogs,
  onAutoClearLogsChange,
  nextClearCountdown,
  unattendedAccess,
  onUnattendedAccessChange,
  runInBackground,
  onRunInBackgroundChange,
}) => {
  const [targetIdInput, setTargetIdInput] = useState("");
  const [targetPassInput, setTargetPassInput] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Pre-configured historical sessions for quick testing
  const [recentSessions] = useState<RecentSession[]>([
    { id: "s1", deviceId: "813 524 901", alias: "Simulated Lab Node B", lastConnected: "2 hours ago" },
    { id: "s2", deviceId: "492 110 384", alias: "Backup Files Server", lastConnected: "1 day ago" },
  ]);

  // Formats ID: 123456789 -> 123 456 789
  const formatDeviceId = (idStr: string) => {
    const cleaned = idStr.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return idStr;
  };

  const handleIdInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 9) {
      setTargetIdInput(val);
    }
  };

  const copyToClipboard = (text: string, type: "id" | "pass") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetIdInput.length !== 9) return;
    onConnect(targetIdInput, targetPassInput);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mx-auto">
      
      {/* Left Panel: My Local Host Credentials */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-xl space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Laptop className="w-5 h-5" />
            <h3 className="font-bold tracking-tight text-sm uppercase">This Local Workspace</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your system is listening for secure remote controller invitations. Provide the Device ID and access password below to allow access.
          </p>

          {/* Device ID Display Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-1">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-bold">Your Device ID</span>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-mono font-bold tracking-widest text-slate-100">
                {formatDeviceId(deviceId)}
              </span>
              <button
                onClick={() => copyToClipboard(deviceId, "id")}
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-900 rounded-lg transition-all cursor-pointer"
                title="Copy Device ID"
              >
                {copiedId ? <ClipboardCheck className="text-emerald-400 w-4.5 h-4.5" /> : <Clipboard className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Security Password Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-bold flex items-center gap-1">
                <Shield size={10} className="text-emerald-400" /> Remote Access Password
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Default: Fixed</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base font-mono font-bold tracking-wider text-slate-300">
                {securityPassword}
              </span>
              <button
                onClick={() => copyToClipboard(securityPassword, "pass")}
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-900 rounded-lg transition-all cursor-pointer"
                title="Copy Password"
              >
                {copiedPass ? <ClipboardCheck className="text-emerald-400 w-4.5 h-4.5" /> : <Clipboard className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Local Host Status Indicators */}
        <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 font-mono">C++ daemon:</span>
            <span className="text-emerald-400 font-bold font-mono">READY</span>
          </div>
          
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition-all cursor-pointer font-semibold"
          >
            <Settings size={13} /> Settings
          </button>
        </div>
      </div>

      {/* Right Panel: Remote Device Controller Invitation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <ArrowRight className="w-5 h-5" />
            <h3 className="font-bold tracking-tight text-sm uppercase">Establish Remote Connection</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enter the 9-digit Device ID and security access credentials of the workstation you want to control. No account registration needed.
          </p>

          <div className="space-y-3">
            {/* Input Remote ID */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-bold">Partner Device ID</label>
              <input
                type="text"
                value={targetIdInput}
                onChange={handleIdInputChange}
                placeholder="000 000 000"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-lg w-full font-mono text-slate-100 tracking-widest text-center focus:outline-none focus:border-indigo-500 placeholder-slate-700 font-bold"
                required
              />
            </div>

            {/* Input Remote Password */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-bold">Access Credentials Password</label>
              <input
                type="password"
                value={targetPassInput}
                onChange={(e) => setTargetPassInput(e.target.value)}
                placeholder="Enter 6-digit passcode..."
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm w-full font-mono text-slate-100 text-center focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                required
              />
            </div>
          </div>

          {/* Lockout Warning for repeated incorrect logins */}
          {connectionStatus === ConnectionStatus.LOCKED_OUT && (
            <div className="bg-red-950/50 border border-red-900/60 p-3 rounded-lg text-xs text-red-400 font-mono text-center">
              TOO MANY ATTEMPTS. Lockout active: <span className="font-bold">{lockoutRemaining}s</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={targetIdInput.length !== 9 || connectionStatus === ConnectionStatus.LOCKED_OUT}
            className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow ${
              targetIdInput.length === 9 && connectionStatus !== ConnectionStatus.LOCKED_OUT
                ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:translate-y-[-1px]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <LogIn size={14} /> Initialize Connection Handshake
          </button>
        </form>

        {/* Recent Session History Nodes */}
        <div className="border-t border-slate-800/80 pt-4 space-y-2">
          <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-bold flex items-center gap-1">
            <History size={11} /> Saved Partner Devices
          </span>
          <div className="grid grid-cols-2 gap-2">
            {recentSessions.map((sess) => (
              <button
                key={sess.id}
                type="button"
                onClick={() => {
                  setTargetIdInput(sess.deviceId.replace(/\s/g, ""));
                  setTargetPassInput(securityPassword); // default password auto-fill
                }}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700/80 rounded-lg p-2.5 text-left transition-all text-xs font-mono group cursor-pointer"
              >
                <div className="text-slate-300 font-semibold truncate group-hover:text-indigo-400 transition-colors">
                  {sess.alias}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">{sess.deviceId}</div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Standalone Native Desktop Companion & Background Daemon Panel */}
      <div className="md:col-span-2 bg-[#111318] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-display font-bold tracking-wide text-slate-100 uppercase">
                Standalone Desktop App & Daemon Engine
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                Unattended Remote Access Daemon • EPHEMERAL ANTI-TELEMETRY CYCLES
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-mono bg-[#050608] px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500">Daemon:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              RUNNING IN BACKGROUND
            </span>
          </div>
        </div>

        {/* Triple Control Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Toggle 1: Background Service */}
          <div className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Background Daemon Mode</span>
                <span className="text-[9px] font-mono text-slate-600 bg-blue-500/10 text-blue-400 px-1.5 rounded">Native Hook</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Minimize or close client window to the system tray. The underlying C++ remote-listening service remains active in memory.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-2.5">
              <span className="text-xs font-semibold text-slate-400">Keep Daemon Active</span>
              <button
                type="button"
                onClick={() => onRunInBackgroundChange(!runInBackground)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer outline-none focus:ring-1 focus:ring-blue-500/40 ${
                  runInBackground ? "bg-blue-600" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                  runInBackground ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* Toggle 2: Unattended Access */}
          <div className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Unattended Access</span>
                <span className="text-[9px] font-mono text-slate-600 bg-emerald-500/10 text-emerald-400 px-1.5 rounded">Pre-authorized</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Allow authenticated partners to establish a background connection instantly using your secret password, skipping visual prompt alerts.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-2.5">
              <span className="text-xs font-semibold text-slate-400">Unattended Access</span>
              <button
                type="button"
                onClick={() => onUnattendedAccessChange(!unattendedAccess)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer outline-none focus:ring-1 focus:ring-emerald-500/40 ${
                  unattendedAccess ? "bg-emerald-600" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                  unattendedAccess ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* Toggle 3: Log Clearing Interval */}
          <div className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Log Auto-Purge Security</span>
                <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 rounded animate-pulse">
                  Flush in {nextClearCountdown}s
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Physically purge and clear the system log file and background connection telemetry buffers completely every 20 seconds.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-2.5">
              <span className="text-xs font-semibold text-slate-400">Auto-Clear Log (20s)</span>
              <button
                type="button"
                onClick={() => onAutoClearLogsChange(!autoClearLogs)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer outline-none focus:ring-1 focus:ring-amber-500/40 ${
                  autoClearLogs ? "bg-amber-600" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                  autoClearLogs ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

        </div>

        {/* Local Deployment Guide & Build Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          
          {/* Packaging Scripts & Commands */}
          <div className="bg-[#07080B] border border-slate-800/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 font-mono">
              <Activity size={13} className="text-blue-400" />
              HOW TO DEPLOY & RUN NATIVELY ON YOUR LAPTOP
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              To launch RustDesk Lite as a native desktop application wrapper on your laptop (which supports persistent background tray execution and automated file logs clearing):
            </p>
            <div className="bg-[#040507] border border-slate-900 p-3 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                <span>Terminal (Windows Powershell / macOS Bash)</span>
                <span className="text-blue-500 font-semibold">100% STANDALONE COMPLIANT</span>
              </div>
              <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
{`# 1. Clone or extract this project folder locally
# 2. Open terminal inside the workspace
npm install

# 3. Compile built-in Electron wrapper & start application
npm run electron:start`}
              </pre>
            </div>
          </div>

          {/* Deployment Integrity Benefits */}
          <div className="bg-[#07080B] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                <Check className="text-emerald-400" size={14} />
                DEPLOYMENT & EXECUTION INTEGRITY
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1 leading-normal list-disc pl-4">
                <li><strong className="text-slate-300">PWA Support:</strong> Open this app in any desktop browser, click the browser URL install badge, and install it as an isolated standalone app.</li>
                <li><strong className="text-slate-300">Electron Native Bridge:</strong> Runs in the background tray with native file system permissions to manage log directories.</li>
                <li><strong className="text-slate-300">Unattended Daemon:</strong> Allows remote troubleshooting with instant consent bypass if password is provided.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-900/80 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  alert("Standalone PWA manifest registered successfully! If deployed, you can install RustDesk Lite directly via your browser's install badge in the search bar.");
                }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Download size={11} /> Install Desktop Web-App
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
