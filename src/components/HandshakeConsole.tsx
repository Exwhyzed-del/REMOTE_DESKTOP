import React, { useEffect, useState } from "react";
import { Terminal, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import { getHandshakeLogs } from "../utils/security";

interface HandshakeConsoleProps {
  remoteDeviceId: string;
  sessionKey: string;
  replayToken: string;
  networkPreset: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const HandshakeConsole: React.FC<HandshakeConsoleProps> = ({
  remoteDeviceId,
  sessionKey,
  replayToken,
  networkPreset,
  onComplete,
  onCancel,
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("Initializing transport layer...");
  
  const allLogs = getHandshakeLogs(remoteDeviceId, sessionKey, replayToken, networkPreset);

  useEffect(() => {
    let currentLogIndex = 0;
    
    // Staggered interval to simulate network handshake sequences
    const logInterval = setInterval(() => {
      if (currentLogIndex < allLogs.length) {
        setLogs((prev) => [...prev, allLogs[currentLogIndex]]);
        
        // Dynamic Stage labels
        const log = allLogs[currentLogIndex];
        if (log.includes("TCP")) {
          setStage("Establishing TCP socket transport...");
        } else if (log.includes("TLSv1.3")) {
          setStage("Negotiating TLSv1.3 OpenSSL Handshake...");
        } else if (log.includes("ephemeral Diffie-Hellman")) {
          setStage("Exchanging ephemeral DH session keys...");
        } else if (log.includes("Auth")) {
          setStage("Authenticating password verification hash...");
        } else if (log.includes("DXGI")) {
          setStage("Initializing DirectX DXGI Desktop Duplication API...");
        } else if (log.includes("FFmpeg")) {
          setStage("Configuring hardware video codec pipeline...");
        } else if (log.includes("UDP")) {
          setStage("Activating high-speed UDP stream flow...");
        }

        currentLogIndex++;
        setProgress(Math.round((currentLogIndex / allLogs.length) * 100));
      } else {
        clearInterval(logInterval);
        // Completed connection successfully
        const delayTimeout = setTimeout(() => {
          onComplete();
        }, 800);
        return () => clearTimeout(delayTimeout);
      }
    }, 220); // Quick realistic delay for Boost.Asio

    return () => clearInterval(logInterval);
  }, []);

  return (
    <div id="handshake-console" className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl font-mono text-slate-300 max-w-xl w-full mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2 text-indigo-400">
          <Terminal size={18} />
          <span className="font-bold tracking-wider text-xs">C++ ENGINE CONNECTION SOCKET</span>
        </div>
        <span className="text-[10px] text-slate-500">BOOST.ASIO v1.30 // OPENSSL v3.2</span>
      </div>

      {/* Progress Info */}
      <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800/80 space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-400">HANDSHAKE SEQUENCE</span>
          <span className="text-indigo-400">{progress}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
            {stage}
          </span>
          <span>Target ID: {remoteDeviceId}</span>
        </div>
      </div>

      {/* Log Output Console */}
      <div className="bg-slate-950 border border-slate-900 rounded-lg p-3.5 h-64 overflow-y-auto text-[11px] leading-relaxed space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {logs.map((log, index) => {
          let textClass = "text-slate-400";
          if (log.includes("[Security]")) textClass = "text-cyan-400";
          if (log.includes("[OpenSSL]")) textClass = "text-indigo-400";
          if (log.includes("[FFmpeg]")) textClass = "text-amber-400";
          if (log.includes("[DXGI]")) textClass = "text-emerald-400 font-bold";
          if (log.includes("validated") || log.includes("established") || log.includes("ready")) {
            textClass += " font-semibold text-emerald-400";
          }
          return (
            <div key={index} className="flex gap-2 items-start animate-fade-in">
              <span className="text-slate-700 select-none">{(index + 1).toString().padStart(2, "0")}</span>
              <span className={textClass}>{log}</span>
            </div>
          );
        })}
        <div className="w-1.5 h-3.5 bg-slate-400 animate-pulse inline-block" />
      </div>

      {/* Connection Mode Footer buttons */}
      <div className="flex gap-3 justify-end border-t border-slate-900 pt-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold border border-slate-800/80 transition-all cursor-pointer"
        >
          Abort Session Socket
        </button>
      </div>
    </div>
  );
};
