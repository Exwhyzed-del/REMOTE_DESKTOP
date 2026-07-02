import React from "react";
import { NetworkPreset, ColorDepth, ControlMode, CaptureMode } from "../types";
import { Shield, Network, Eye, Layers, Settings, RefreshCw, Smartphone } from "lucide-react";

interface SettingsPanelProps {
  currentPassword: string;
  onPasswordChange: (pwd: string) => void;
  networkPreset: NetworkPreset;
  onNetworkPresetChange: (preset: NetworkPreset) => void;
  colorDepth: ColorDepth;
  onColorDepthChange: (depth: ColorDepth) => void;
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  captureMode: CaptureMode;
  onCaptureModeChange: (mode: CaptureMode) => void;
  onResetDeviceId: () => void;
  isHardwareEncoding: boolean;
  onToggleHardwareEncoding: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentPassword,
  onPasswordChange,
  networkPreset,
  onNetworkPresetChange,
  colorDepth,
  onColorDepthChange,
  controlMode,
  onControlModeChange,
  captureMode,
  onCaptureModeChange,
  onResetDeviceId,
  isHardwareEncoding,
  onToggleHardwareEncoding,
}) => {
  return (
    <div id="settings-panel" className="bg-slate-900 border border-slate-700/60 rounded-xl p-5 text-slate-200 shadow-2xl h-full space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Settings size={18} className="text-indigo-400" />
        <h3 className="font-bold tracking-tight text-sm uppercase">Engine & Streaming Preferences</h3>
      </div>

      {/* Security Credentials */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Shield size={14} className="text-emerald-400" /> Access Security Password
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={currentPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm w-full font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            placeholder="Set remote access password..."
          />
        </div>
        <p className="text-[10px] text-slate-500">
          Entering this password from a remote controller grants immediate connection access.
        </p>
      </div>

      {/* Input / Screen Source Mode */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Layers size={14} className="text-cyan-400" /> Capture Mode Source
        </label>
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onCaptureModeChange(CaptureMode.VIRTUAL_OS)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              captureMode === CaptureMode.VIRTUAL_OS
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Virtual Workspace
          </button>
          <button
            onClick={() => onCaptureModeChange(CaptureMode.REAL_SCREEN)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              captureMode === CaptureMode.REAL_SCREEN
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Live Screen Capture
          </button>
        </div>
        <p className="text-[10px] text-slate-500">
          {captureMode === CaptureMode.VIRTUAL_OS
            ? "Simulates high-performance OS actions (Terminal, files, dirty rectangles overlay) inside the browser."
            : "Literally captures your real monitors / browser tabs using native browser Screen Recording APIs."}
        </p>
      </div>

      {/* Network Presets (RTT / Latency simulation) */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Network size={14} className="text-pink-400" /> Network Profile Emulation
        </label>
        <select
          value={networkPreset}
          onChange={(e) => onNetworkPresetChange(e.target.value as NetworkPreset)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs w-full font-mono text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value={NetworkPreset.LAN}>Intranet LAN (60 FPS, &lt;3ms, 25 Mbps)</option>
          <option value={NetworkPreset.WAN_4G}>WAN 4G LTE (30 FPS, 35-50ms, 8 Mbps)</option>
          <option value={NetworkPreset.WAN_3G}>WAN 3G Network (15 FPS, 120-150ms, 1.5 Mbps)</option>
          <option value={NetworkPreset.BAD_CONNECTION}>High Packet Loss (30 FPS, 90ms, 5% loss)</option>
        </select>
        <p className="text-[10px] text-slate-500">
          Emulates packet delay and bandwidth locks. The streaming engine will adapt quality parameters in response.
        </p>
      </div>

      {/* Color Depth Compression */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Layers size={14} className="text-amber-400" /> Color Encoding Depth
        </label>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <button
            onClick={() => onColorDepthChange(ColorDepth.DEPTH_24BIT)}
            className={`p-1.5 border rounded-lg ${
              colorDepth === ColorDepth.DEPTH_24BIT
                ? "border-amber-400 bg-amber-500/10 text-amber-300"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300"
            }`}
          >
            24-Bit RGB
          </button>
          <button
            onClick={() => onColorDepthChange(ColorDepth.DEPTH_16BIT)}
            className={`p-1.5 border rounded-lg ${
              colorDepth === ColorDepth.DEPTH_16BIT
                ? "border-amber-400 bg-amber-500/10 text-amber-300"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300"
            }`}
          >
            16-Bit RGB
          </button>
          <button
            onClick={() => onColorDepthChange(ColorDepth.DEPTH_8BIT_GRAY)}
            className={`p-1.5 border rounded-lg ${
              colorDepth === ColorDepth.DEPTH_8BIT_GRAY
                ? "border-amber-400 bg-amber-500/10 text-amber-300"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300"
            }`}
          >
            8-Bit Gray
          </button>
        </div>
        <p className="text-[10px] text-slate-500">
          Lowering depth increases compression ratio, dropping bandwidth load significantly in poor networks.
        </p>
      </div>

      {/* Default Control Mode */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Eye size={14} className="text-indigo-400" /> Remote Input Permission
        </label>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <button
            onClick={() => onControlModeChange(ControlMode.FULL_CONTROL)}
            className={`p-1.5 border rounded-lg ${
              controlMode === ControlMode.FULL_CONTROL
                ? "border-indigo-400 bg-indigo-500/10 text-indigo-300"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300"
            }`}
          >
            Full Control
          </button>
          <button
            onClick={() => onControlModeChange(ControlMode.VIEW_ONLY)}
            className={`p-1.5 border rounded-lg ${
              controlMode === ControlMode.VIEW_ONLY
                ? "border-indigo-400 bg-indigo-500/10 text-indigo-300"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300"
            }`}
          >
            View Only
          </button>
        </div>
      </div>

      {/* Hardware Encoding Toggle */}
      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-300">GPU Hardware Acceleration</span>
          <span className="text-[9px] text-slate-500">Use NVENC / Intel QuickSync</span>
        </div>
        <button
          onClick={onToggleHardwareEncoding}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isHardwareEncoding ? "bg-indigo-600" : "bg-slate-800"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isHardwareEncoding ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Device Management Action */}
      <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-xs">
        <span className="text-slate-400">Troubleshooting System:</span>
        <button
          onClick={onResetDeviceId}
          className="flex items-center gap-1 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-900/50 px-2.5 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw size={12} /> Regenerate Device ID
        </button>
      </div>
    </div>
  );
};
