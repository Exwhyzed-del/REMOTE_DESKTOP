import React, { useEffect, useState } from "react";
import { NetworkMetrics } from "../types";
import { Activity, ShieldCheck, Cpu, Database, Zap } from "lucide-react";

interface PerformanceHUDProps {
  metrics: NetworkMetrics;
  sessionKey: string;
  isRealScreen: boolean;
}

export const PerformanceHUD: React.FC<PerformanceHUDProps> = ({
  metrics,
  sessionKey,
  isRealScreen,
}) => {
  // Store rolling history for charts
  const [fpsHistory, setFpsHistory] = useState<number[]>(Array(20).fill(60));
  const [latencyHistory, setLatencyHistory] = useState<number[]>(Array(20).fill(5));
  const [bitrateHistory, setBitrateHistory] = useState<number[]>(Array(20).fill(1.5));

  useEffect(() => {
    setFpsHistory((prev) => [...prev.slice(1), metrics.fps]);
    setLatencyHistory((prev) => [...prev.slice(1), metrics.latency]);
    setBitrateHistory((prev) => [...prev.slice(1), metrics.bitrate]);
  }, [metrics]);

  const renderMiniChart = (history: number[], maxVal: number, colorClass: string) => {
    const width = 160;
    const height = 40;
    const points = history
      .map((val, idx) => {
        const x = (idx / (history.length - 1)) * width;
        const normalizedVal = maxVal > 0 ? val / maxVal : 0;
        const y = height - normalizedVal * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={colorClass}
          points={points}
        />
        {/* Shading area underneath line */}
        <path
          d={`M 0,${height} L ${points} L ${width},${height} Z`}
          fill="currentColor"
          className={`${colorClass} opacity-10`}
        />
      </svg>
    );
  };

  return (
    <div id="performance-hud" className="bg-slate-900/95 border border-slate-700/60 rounded-xl p-4 text-xs font-mono text-slate-300 shadow-2xl backdrop-blur-md max-w-md w-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Activity size={14} className="animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[10px]">Active Stream Engine Diagnostics</span>
        </div>
        <div className="text-[10px] text-slate-500 flex items-center gap-1">
          <ShieldCheck size={11} className="text-emerald-500" /> Secure Link Active
        </div>
      </div>

      {/* Grid of charts and metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* FPS */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Framerate</span>
            <span className="text-emerald-400 font-bold text-sm">{metrics.fps} FPS</span>
          </div>
          <div className="mt-2 flex justify-center">
            {renderMiniChart(fpsHistory, 75, "text-emerald-400")}
          </div>
        </div>

        {/* Latency */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Latency (RTT)</span>
            <span className="text-cyan-400 font-bold text-sm">{metrics.latency} ms</span>
          </div>
          <div className="mt-2 flex justify-center">
            {renderMiniChart(latencyHistory, 150, "text-cyan-400")}
          </div>
        </div>

        {/* Bitrate */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Bitrate</span>
            <span className="text-amber-400 font-bold text-sm">{metrics.bitrate.toFixed(2)} Mbps</span>
          </div>
          <div className="mt-2 flex justify-center">
            {renderMiniChart(bitrateHistory, 30, "text-amber-400")}
          </div>
        </div>

        {/* Packet Loss */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Packet Loss</span>
            <span className={`font-bold text-sm ${metrics.packetLoss > 1 ? "text-red-400" : "text-slate-400"}`}>
              {metrics.packetLoss.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 text-center text-[10px] flex flex-col justify-center items-center h-10">
            <span className="text-slate-500">Auto Reconnection</span>
            <span className="text-emerald-500 font-bold">Enabled (TCP/UDP)</span>
          </div>
        </div>
      </div>

      {/* Meta specifications */}
      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-[10px] space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <Cpu size={10} /> Video Encoder:
          </span>
          <span className="text-slate-300">
            {metrics.hardwareEncoding ? "FFmpeg H.264 (NVENC GPU-Acc)" : "FFmpeg H.264 (Software Fallback)"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <Zap size={10} /> Screen Capture API:
          </span>
          <span className="text-slate-300">
            {isRealScreen ? "Browser Media Capture API" : "DXGI Desktop Duplication API v1.2"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 flex items-center gap-1">
            <Database size={10} /> Frame Optimization:
          </span>
          <span className="text-slate-300 flex gap-1.5 items-center">
            <span className="text-emerald-400 font-semibold">{metrics.dirtyRectsCount} Dirty Rects</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400">CR: {metrics.compressionRatio.toFixed(1)}:1</span>
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 mt-1.5">
          <span className="text-slate-500">Session Handshake Key:</span>
          <span className="text-[9px] text-slate-400 truncate max-w-[200px]" title={sessionKey}>
            {sessionKey}
          </span>
        </div>
      </div>
    </div>
  );
};
