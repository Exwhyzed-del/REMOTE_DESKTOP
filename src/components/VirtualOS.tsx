import React, { useState, useEffect, useRef } from "react";
import { 
  Folder, FileText, MonitorPlay, Terminal as TermIcon, Check, X, 
  Play, Cpu, ArrowRight, CornerDownRight, Copy, ShieldAlert, Lock, HelpCircle 
} from "lucide-react";
import { VirtualFile, ControlMode, NetworkPreset } from "../types";

interface VirtualOSProps {
  controlMode: ControlMode;
  networkPreset: NetworkPreset;
  onInputEvent: (type: "click" | "move" | "keydown" | "scroll" | "drag", detail: string, dataSize: number) => void;
  latencyMs: number;
}

export const VirtualOS: React.FC<VirtualOSProps> = ({
  controlMode,
  networkPreset,
  onInputEvent,
  latencyMs,
}) => {
  // Desktop files
  const [files, setFiles] = useState<VirtualFile[]>([
    { id: "1", name: "C++ Encoder Project", type: "folder", x: 20, y: 30 },
    { id: "2", name: "dxgi_duplication.cpp", type: "code", content: `#include <d3d11.h>\n#include <dxgi1_2.h>\n\n// DirectX 12 Desktop Duplication capture\nHRESULT CaptureDesktopFrame() {\n  IDXGIOutputDuplication* pDupl = nullptr;\n  DXGI_OUTDUPL_FRAME_INFO frameInfo;\n  IDXGIResource* pResource = nullptr;\n  \n  hr = pDupl->AcquireNextFrame(50, &frameInfo, &pResource);\n  if (SUCCEEDED(hr)) {\n    // Extract dirty rectangles and push to NVENC encoder...\n  }\n}`, x: 20, y: 120 },
    { id: "3", name: "session_hashes.txt", type: "txt", content: "Local Device Hash: d4d7d244-048a-48f9\nAuthorized controller: 123456\nEncryption Cipher: AES-256-GCM\nReplay Protection: Enabled\nTCP port: 3000\nUDP port: 3001", x: 20, y: 210 },
    { id: "4", name: "RustDesk Settings", type: "folder", x: 150, y: 30 },
  ]);

  // Window states
  const [openWindows, setOpenWindows] = useState<{
    terminal: boolean;
    explorer: boolean;
    diagnostics: boolean;
    notepad: boolean;
  }>({
    terminal: false,
    explorer: false,
    diagnostics: true, // open by default to showcase the core dirty rects
    notepad: false,
  });

  // Dragging states for files
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Input States
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "OS System Kernel v11.0.2 ready.",
    "Dual connection listener bound to TCP:3000, UDP:3001.",
    "Type 'help' to see available remote diagnostics commands.",
  ]);

  const [notepadText, setNotepadText] = useState(
    "Dear Admin,\n\nThis Remote Desktop session is secured via AES-256-GCM, with high-performance 60FPS DirectX Desktop Duplication streaming frame data. You can drag and drop folders, type directly in this notepad, or execute terminal operations below."
  );

  // Mouse cursor tracking (with latency)
  const [clientMouse, setClientMouse] = useState({ x: 100, y: 150 });
  const [remoteMouse, setRemoteMouse] = useState({ x: 100, y: 150 });
  const desktopRef = useRef<HTMLDivElement>(null);

  // Cursor ripples on click
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  
  // Flash overlays for "Dirty Rectangles" DXGI rendering visualization
  const [dirtyRects, setDirtyRects] = useState<{ id: number; x: number; y: number; w: number; h: number }[]>([]);

  // Monitor updates to trigger simulated "dirty rectangle" capture events
  const triggerDirtyRect = (x: number, y: number, w: number, h: number) => {
    const id = Date.now() + Math.random();
    setDirtyRects((prev) => [...prev, { id, x, y, w, h }]);
    setTimeout(() => {
      setDirtyRects((prev) => prev.filter((r) => r.id !== id));
    }, 450); // Flash animation duration
  };

  // Keyboard shortcut feedback toasts
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);

  // Mouse Move listener with latency queue
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!desktopRef.current) return;
    const rect = desktopRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setClientMouse({ x, y });

    // Stream movement event
    onInputEvent("move", `X:${Math.round(x)} Y:${Math.round(y)}`, 8);

    // Queue remote cursor latency delay
    setTimeout(() => {
      setRemoteMouse({ x, y });
    }, latencyMs);
  };

  // Click handler
  const handleDesktopClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!desktopRef.current || controlMode === ControlMode.VIEW_ONLY) {
      if (controlMode === ControlMode.VIEW_ONLY) {
        setShortcutToast("Permission Denied: View-Only Mode Active");
        setTimeout(() => setShortcutToast(null), 2000);
      }
      return;
    }

    const rect = desktopRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create click ripple cue
    const rippleId = Date.now();
    setRipples((prev) => [...prev, { id: rippleId, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);

    // Trigger local dirty rectangle around click target
    triggerDirtyRect(x - 30, y - 30, 60, 60);

    onInputEvent("click", `Button:Left X:${Math.round(x)} Y:${Math.round(y)}`, 12);
  };

  // File Drag Drop Logic
  const startDrag = (e: React.MouseEvent, fileId: string) => {
    if (controlMode === ControlMode.VIEW_ONLY) return;
    e.stopPropagation();
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    if (!desktopRef.current) return;
    const rect = desktopRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    setDraggedFile(fileId);
    setDragOffset({
      x: clientX - file.x,
      y: clientY - file.y,
    });
    
    onInputEvent("drag", `Start dragging file: ${file.name}`, 16);
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (!draggedFile || !desktopRef.current || controlMode === ControlMode.VIEW_ONLY) return;
    const rect = desktopRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const newX = Math.max(10, Math.min(rect.width - 120, clientX - dragOffset.x));
    const newY = Math.max(10, Math.min(rect.height - 80, clientY - dragOffset.y));

    setFiles((prev) =>
      prev.map((f) => (f.id === draggedFile ? { ...f, x: newX, y: newY } : f))
    );

    // Generate dirty rectangle along the drag vector
    if (Math.random() < 0.3) {
      triggerDirtyRect(newX - 5, newY - 5, 120, 90);
    }
  };

  const stopDrag = () => {
    if (!draggedFile) return;
    const file = files.find((f) => f.id === draggedFile);
    if (file) {
      onInputEvent("drag", `Dropped file: ${file.name} at X:${Math.round(file.x)} Y:${Math.round(file.y)}`, 20);
      triggerDirtyRect(file.x - 10, file.y - 10, 130, 100);
    }
    setDraggedFile(null);
  };

  // Handle keys and key combinations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (controlMode === ControlMode.VIEW_ONLY) return;

      // Intercept key events inside target
      let shortcutStr = "";
      if (e.ctrlKey && e.key.toLowerCase() === "c") {
        shortcutStr = "Ctrl + C (Copy Signal)";
      } else if (e.ctrlKey && e.key.toLowerCase() === "v") {
        shortcutStr = "Ctrl + V (Paste Signal)";
      } else if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        shortcutStr = "Alt + Tab (App Switcher)";
      }

      if (shortcutStr) {
        setShortcutToast(`Transmitted Shortcut: ${shortcutStr}`);
        onInputEvent("keydown", `Shortcut: ${shortcutStr}`, 15);
        triggerDirtyRect(100, 100, 500, 300);
        setTimeout(() => setShortcutToast(null), 2200);
      } else if (e.key.length === 1) {
        // Log regular keystroke
        onInputEvent("keydown", `Key: ${e.key}`, 10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controlMode]);

  // Terminal commands interpreter
  const handleTerminalCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim().toLowerCase();
    let response = "";

    switch (cmd) {
      case "help":
        response = "Available Commands:\n  - ping : Tests simulated low-latency UDP heartbeat\n  - dxgi : Displays active DirectX Desktop Duplication status\n  - nvenc : Inspects hardware video encoder card state\n  - clear : Clears terminal buffer";
        break;
      case "ping":
        response = `PING rustdesk.org (185.190.140.23): 56 data bytes\n64 bytes from 185.190.140.23: icmp_seq=1 ttl=55 time=${(latencyMs / 2).toFixed(1)}ms\n64 bytes from 185.190.140.23: icmp_seq=2 ttl=55 time=${(latencyMs / 2 + 1).toFixed(1)}ms\n--- rustdesk.org ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;
        break;
      case "dxgi":
        response = "[DXGI Capture Engine]\n  Active Duplication Interface: DXGI_OUTPUT_DUPLICATION_v2\n  Monitor ID: Primary Monitor (1920x1080 @ 60Hz)\n  Pointer updates: HW-accelerated mouse buffer overlay\n  Frame capturing speed: 0.14ms\n  Status: Running";
        break;
      case "nvenc":
        response = "[FFmpeg NVENC Hardware Engine]\n  Hardware Mode: NVIDIA NVENC SDK\n  Device: GeForce RTX 4080 (CUDA Dynamic Link)\n  Preset: LOW_LATENCY_HQ\n  Codec: H.264 High Profile\n  Current Bitrate Adaptation: Active";
        break;
      case "clear":
        setTerminalLogs([]);
        setTerminalInput("");
        triggerDirtyRect(200, 200, 450, 300);
        return;
      default:
        response = `Command not found: '${cmd}'. Type 'help' for custom commands.`;
    }

    setTerminalLogs((prev) => [...prev, `remote-user@system:~$ ${terminalInput}`, response]);
    setTerminalInput("");
    triggerDirtyRect(150, 150, 500, 320);
  };

  return (
    <div
      ref={desktopRef}
      onMouseMove={handleMouseMove}
      onClick={handleDesktopClick}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      className="relative w-full h-[580px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-xl border border-slate-700/80 overflow-hidden shadow-2xl select-none cursor-none"
    >
      {/* Network Latency Mirror Cursor Indicator */}
      <div
        className="absolute w-4 h-4 text-emerald-400 pointer-events-none z-50 transition-transform duration-75"
        style={{
          left: `${remoteMouse.x}px`,
          top: `${remoteMouse.y}px`,
          transform: "translate(-2px, -2px)",
        }}
      >
        {/* Customized mouse arrow cursor design with tiny RTT lag marker */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <path
            fill="#34d399"
            stroke="#020617"
            strokeWidth="1.5"
            d="M5.5 3.2v16.2l4.8-4.8 3.5 8 2.5-1.1-3.5-7.9 6.2-.1z"
          />
        </svg>
        <span className="absolute left-4 top-4 bg-slate-950/80 text-[8px] text-emerald-300 border border-slate-800 px-1 rounded font-mono">
          {latencyMs}ms RTT
        </span>
      </div>

      {/* Actual user physical mouse indicator (no lag) */}
      <div
        className="absolute w-2 h-2 bg-indigo-500 rounded-full opacity-40 pointer-events-none z-50"
        style={{
          left: `${clientMouse.x}px`,
          top: `${clientMouse.y}px`,
          transform: "translate(-4px, -4px)",
        }}
      />

      {/* Grid Background wallpaper styling */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] opacity-70 pointer-events-none" />

      {/* Render Desktop File Icons */}
      <div className="absolute inset-0 p-6 flex flex-col flex-wrap gap-y-6 content-start z-10">
        {files.map((file) => (
          <div
            key={file.id}
            onMouseDown={(e) => startDrag(e, file.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (file.id === "1" || file.id === "4") {
                setOpenWindows((w) => ({ ...w, explorer: true }));
              } else if (file.id === "2") {
                setOpenWindows((w) => ({ ...w, notepad: true }));
              } else if (file.id === "3") {
                setOpenWindows((w) => ({ ...w, notepad: true }));
              }
              triggerDirtyRect(100, 100, 400, 300);
            }}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-center cursor-grab active:cursor-grabbing w-24 hover:bg-white/5 transition-all group ${
              draggedFile === file.id ? "bg-white/10 opacity-70 border border-indigo-500/50" : ""
            }`}
            style={{
              position: draggedFile === file.id ? "absolute" : "static",
              left: draggedFile === file.id ? `${file.x}px` : undefined,
              top: draggedFile === file.id ? `${file.y}px` : undefined,
            }}
          >
            {file.type === "folder" ? (
              <Folder className="text-amber-400 w-10 h-10 drop-shadow group-hover:scale-105 transition-transform" />
            ) : (
              <FileText className="text-cyan-400 w-10 h-10 drop-shadow group-hover:scale-105 transition-transform" />
            )}
            <span className="text-[10px] text-slate-200 mt-1.5 font-sans font-medium line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] max-w-full leading-tight">
              {file.name}
            </span>
          </div>
        ))}
      </div>

      {/* SYSTEM APPS WINDOWS */}

      {/* Window 1: Graphics & Dirty Rectangles Diagnostics Monitor */}
      {openWindows.diagnostics && (
        <div
          onMouseDown={() => triggerDirtyRect(100, 50, 480, 240)}
          className="absolute right-5 top-5 w-[460px] bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden"
        >
          <div className="bg-slate-950 px-4 py-2 flex justify-between items-center border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <MonitorPlay size={13} className="text-emerald-400" /> dxgi_dirty_rect_visualizer.exe
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenWindows((w) => ({ ...w, diagnostics: false }));
              }}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3 text-[10px] font-mono text-slate-300 space-y-3 bg-slate-900/90 leading-normal">
            <div className="flex items-center gap-2 justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">GPU DUPLICATION STATUS</span>
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <div className="text-slate-400 text-xs">
              This panel displays **Dirty Rectangles** overlay in real time. Whenever pixels change inside the Remote Target OS, our C++ DXGI engine detects the boundary region, frames it, compresses the box, and streams it!
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-500">Dirty Rect Overlays:</span>
              <span className="text-emerald-400 font-bold animate-pulse">FLASHING GREEN OVER DESKTOP</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Simulate sudden full screen update
                  triggerDirtyRect(0, 0, 800, 600);
                  onInputEvent("click", "Manually triggered full DXGI screen refresh", 15000);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow"
              >
                <Cpu size={12} /> Force Full Screen Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Window 2: C++ Remote Command Terminal */}
      {openWindows.terminal && (
        <div className="absolute left-10 bottom-16 w-[450px] bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden">
          <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <TermIcon size={13} className="text-indigo-400" /> remote_host_shell.exe
            </span>
            <button
              onClick={() => setOpenWindows((w) => ({ ...w, terminal: false }))}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3 font-mono text-[11px] space-y-2 flex flex-col h-48 justify-between">
            <div className="overflow-y-auto max-h-36 space-y-1.5">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap text-slate-300 font-mono leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
            <form onSubmit={handleTerminalCommand} className="flex gap-1.5 border-t border-slate-800 pt-2 items-center">
              <span className="text-indigo-400 select-none">remote-user@system:~$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="bg-transparent text-slate-100 outline-none w-full border-none p-0 focus:ring-0 text-[11px] font-mono"
                placeholder="type help, ping, dxgi, nvenc..."
                autoFocus
              />
            </form>
          </div>
        </div>
      )}

      {/* Window 3: Notepad Writer */}
      {openWindows.notepad && (
        <div className="absolute left-28 top-28 w-[420px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden">
          <div className="bg-slate-950 px-4 py-2 flex justify-between items-center border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-sans">
              <FileText size={13} className="text-cyan-400" /> active_notes.txt - Notepad
            </span>
            <button
              onClick={() => setOpenWindows((w) => ({ ...w, notepad: false }))}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            value={notepadText}
            onChange={(e) => {
              if (controlMode === ControlMode.VIEW_ONLY) return;
              setNotepadText(e.target.value);
              // Trigger tiny dirty rect for text cursor typing updates
              triggerDirtyRect(120, 150, 300, 100);
              onInputEvent("keydown", "Typed characters in notepad", 12);
            }}
            readOnly={controlMode === ControlMode.VIEW_ONLY}
            className="w-full h-44 bg-slate-950 text-slate-200 p-3 text-xs font-mono outline-none border-none resize-none focus:ring-0 leading-relaxed"
          />
        </div>
      )}

      {/* Window 4: Saved files explorer */}
      {openWindows.explorer && (
        <div className="absolute left-40 top-16 w-[380px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden">
          <div className="bg-slate-950 px-4 py-2 flex justify-between items-center border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-sans">
              <Folder size={13} className="text-amber-400" /> Remote Files Directory
            </span>
            <button
              onClick={() => setOpenWindows((w) => ({ ...w, explorer: false }))}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3 space-y-2 text-xs font-sans text-slate-300">
            <p className="text-[10px] text-slate-500">Double click file icons to view contents</p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 divide-y divide-slate-900">
              <div className="py-2 px-1 flex justify-between items-center hover:bg-slate-900/50 rounded transition-all">
                <span className="flex items-center gap-2"><Folder size={14} className="text-amber-400" /> C++ Encoder Project</span>
                <span className="text-[10px] text-slate-500 font-mono">DIR</span>
              </div>
              <div className="py-2 px-1 flex justify-between items-center hover:bg-slate-900/50 rounded transition-all cursor-pointer"
                   onDoubleClick={() => {
                     setOpenWindows((w) => ({ ...w, notepad: true }));
                     triggerDirtyRect(100, 100, 420, 200);
                   }}>
                <span className="flex items-center gap-2"><FileText size={14} className="text-cyan-400" /> dxgi_duplication.cpp</span>
                <span className="text-[10px] text-slate-500 font-mono">2.4 KB</span>
              </div>
              <div className="py-2 px-1 flex justify-between items-center hover:bg-slate-900/50 rounded transition-all cursor-pointer"
                   onDoubleClick={() => {
                     setOpenWindows((w) => ({ ...w, notepad: true }));
                     triggerDirtyRect(100, 100, 420, 200);
                   }}>
                <span className="flex items-center gap-2"><FileText size={14} className="text-cyan-400" /> session_hashes.txt</span>
                <span className="text-[10px] text-slate-500 font-mono">512 B</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL FEEDBACK AND GRAPHICS */}

      {/* Render mouse click ripples */}
      {ripples.map((rip) => (
        <div
          key={rip.id}
          className="absolute border-2 border-emerald-400 rounded-full pointer-events-none z-40 animate-ping opacity-60"
          style={{
            left: `${rip.x}px`,
            top: `${rip.y}px`,
            width: "36px",
            height: "36px",
            transform: "translate(-18px, -18px)",
          }}
        />
      ))}

      {/* Render "Dirty Rectangles" Overlay flashing grids */}
      {dirtyRects.map((rect) => (
        <div
          key={rect.id}
          className="absolute border border-dashed border-emerald-500/70 bg-emerald-500/5 pointer-events-none z-30 flex items-start justify-start p-1 transition-all"
          style={{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.w}px`,
            height: `${rect.h}px`,
          }}
        >
          <span className="bg-emerald-500 text-slate-950 text-[6px] font-bold px-1 rounded select-none font-mono">
            DXGI RECT
          </span>
        </div>
      ))}

      {/* Keyboard Shortcut/Status Overlay Toasts */}
      {shortcutToast && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-indigo-500 text-indigo-300 font-mono text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 z-40 animate-bounce">
          <ShieldAlert size={14} />
          {shortcutToast}
        </div>
      )}

      {/* Taskbar at bottom of OS screen */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-950/90 border-t border-slate-900 px-4 flex items-center justify-between z-30 backdrop-blur">
        <div className="flex items-center gap-2">
          {/* Windows-like custom rustdesk launcher button */}
          <button
            onClick={() => {
              setOpenWindows((w) => ({ ...w, terminal: !w.terminal }));
              triggerDirtyRect(10, 300, 450, 200);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg font-mono cursor-pointer transition-all"
          >
            <TermIcon size={13} /> TERMINAL
          </button>
          
          <button
            onClick={() => {
              setOpenWindows((w) => ({ ...w, explorer: !w.explorer }));
              triggerDirtyRect(100, 100, 380, 240);
            }}
            className="p-1.5 text-amber-400 hover:bg-slate-900 rounded-lg cursor-pointer transition-all"
            title="File Explorer"
          >
            <Folder size={18} />
          </button>
          
          <button
            onClick={() => {
              setOpenWindows((w) => ({ ...w, diagnostics: !w.diagnostics }));
              triggerDirtyRect(400, 50, 460, 240);
            }}
            className="p-1.5 text-emerald-400 hover:bg-slate-900 rounded-lg cursor-pointer transition-all"
            title="DXGI Graphic Monitor"
          >
            <MonitorPlay size={18} />
          </button>

          <button
            onClick={() => {
              setOpenWindows((w) => ({ ...w, notepad: !w.notepad }));
              triggerDirtyRect(120, 120, 420, 200);
            }}
            className="p-1.5 text-cyan-400 hover:bg-slate-900 rounded-lg cursor-pointer transition-all"
            title="Notepad Writer"
          >
            <FileText size={18} />
          </button>
        </div>

        {/* Info panel on bottom right */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-1">
            {controlMode === ControlMode.FULL_CONTROL ? (
              <span className="text-emerald-400 flex items-center gap-0.5">● Full Control</span>
            ) : (
              <span className="text-amber-400 flex items-center gap-0.5"><Lock size={10} /> View Only</span>
            )}
          </div>
          <span>Net: <span className="text-indigo-400 font-bold">{networkPreset}</span></span>
          <span className="text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
