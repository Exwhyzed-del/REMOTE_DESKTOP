import React, { useEffect, useRef, useState } from "react";
import { Monitor, Play, Square, AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import { NetworkMetrics } from "../types";

interface RealScreenShareProps {
  onMetricsUpdate: (updater: (prev: NetworkMetrics) => NetworkMetrics) => void;
  onInputEvent: (type: "click" | "move" | "keydown" | "scroll" | "drag", detail: string, dataSize: number) => void;
  onStreamReady?: (stream: MediaStream) => void;
}

export const RealScreenShare: React.FC<RealScreenShareProps> = ({
  onMetricsUpdate,
  onInputEvent,
  onStreamReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [infoPopup, setInfoPopup] = useState<boolean>(true);

  // For dirty rectangle detection
  const prevFrameData = useRef<Uint8ClampedArray | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const [dirtyBoxes, setDirtyBoxes] = useState<{ x: number; y: number; w: number; h: number }[]>([]);

  // Start Screen Sharing
  const startCapture = async () => {
    setErrorMsg(null);
    try {
      // request display media from browser
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60 }
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.error("Video play error:", e));
      }

      onStreamReady?.(mediaStream);
      onInputEvent("click", "Real Screen Capture stream initialized.", 24);
    } catch (err: any) {
      console.error("Screen capture initialization failed:", err);
      // Detailed error description for Iframe sandboxes
      if (err.name === "NotAllowedError") {
        setErrorMsg("Permission Denied. The browser or user rejected screen-sharing access.");
      } else if (err.name === "SecurityError" || err.name === "InvalidStateError") {
        setErrorMsg("Iframe Permission Block. Cloud Run sandbox prevents media capture inside sub-iframes. Please click the 'Open in New Tab' button in the AI Studio editor header to share your screen!");
      } else {
        setErrorMsg(`Failed to initialize screen sharing: ${err.message || "Unknown Error"}`);
      }
    }
  };

  // Stop Screen Sharing
  const stopCapture = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsActive(false);
    setDirtyBoxes([]);
    prevFrameData.current = null;
    
    onMetricsUpdate((prev) => ({
      ...prev,
      fps: 0,
      dirtyRectsCount: 0,
      bitrate: 0,
    }));
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Canvas process loop for frame analysis & dirty rectangle detection
  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let lastTime = performance.now();
    let frameCount = 0;

    const analyzeFrame = () => {
      if (video.paused || video.ended) {
        animationFrameId.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Draw active stream frame onto analytics canvas
      ctx.drawImage(video, 0, 0, w, h);

      // Perform fast pixel analysis to compute "Dirty Rectangles"
      const currentFrame = ctx.getImageData(0, 0, w, h);
      const data = currentFrame.data;

      const gridCols = 8;
      const gridRows = 6;
      const colW = Math.floor(w / gridCols);
      const rowH = Math.floor(h / gridRows);
      const newDirtyBoxes: { x: number; y: number; w: number; h: number }[] = [];

      if (prevFrameData.current) {
        const prev = prevFrameData.current;
        
        // Loop through each grid block to detect pixel buffer updates
        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            const startX = c * colW;
            const startY = r * rowH;
            
            // Sample a few pixels in the center of the block for low CPU load
            let blockChanged = false;
            const samples = [
              { x: startX + Math.floor(colW / 2), y: startY + Math.floor(rowH / 2) },
              { x: startX + 5, y: startY + 5 },
              { x: startX + colW - 5, y: startY + rowH - 5 }
            ];

            for (const s of samples) {
              const idx = (s.y * w + s.x) * 4;
              // Check RGB variation threshold
              const diffR = Math.abs(data[idx] - prev[idx]);
              const diffG = Math.abs(data[idx + 1] - prev[idx + 1]);
              const diffB = Math.abs(data[idx + 2] - prev[idx + 2]);

              if (diffR > 18 || diffG > 18 || diffB > 18) {
                blockChanged = true;
                break;
              }
            }

            if (blockChanged) {
              newDirtyBoxes.push({
                x: startX,
                y: startY,
                w: colW,
                h: rowH,
              });
            }
          }
        }
      }

      // Store current data as previous for next tick comparison
      prevFrameData.current = data;
      setDirtyBoxes(newDirtyBoxes);

      // Compute FPS Metrics and dynamically scale simulated bitrate
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;
      
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / elapsed);
        
        // Bitrate calculation based on dynamic size of dirty boxes
        // LAN full-screen is higher; bad network is lower
        const boxRatio = newDirtyBoxes.length / (gridCols * gridRows);
        const dynamicBitrate = 0.4 + (boxRatio * 18.0) * (currentFps / 60);

        onMetricsUpdate((prev) => ({
          ...prev,
          fps: currentFps,
          dirtyRectsCount: newDirtyBoxes.length,
          bitrate: Number(dynamicBitrate.toFixed(2)),
          totalPacketsSent: prev.totalPacketsSent + newDirtyBoxes.length * 2,
          compressionRatio: Number((12.5 + (1 - boxRatio) * 45).toFixed(1)),
        }));

        frameCount = 0;
        lastTime = now;
      }

      // Render green flashing rectangle overlays on the active frame canvas!
      newDirtyBoxes.forEach((box) => {
        ctx.strokeStyle = "#10b981"; // Emerald green
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        
        // draw microscopic tag label
        ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
        ctx.fillRect(box.x, box.y, 45, 10);
        ctx.fillStyle = "#020617";
        ctx.font = "bold 7px monospace";
        ctx.fillText("DIRTY RECT", box.x + 2, box.y + 8);
      });

      animationFrameId.current = requestAnimationFrame(analyzeFrame);
    };

    animationFrameId.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isActive]);

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
      {/* Header section */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Monitor className="text-emerald-400 w-5 h-5" />
          <div>
            <h3 className="text-sm font-bold text-slate-200">DXGI Hardware Duplication Framebuffer</h3>
            <p className="text-[10px] text-slate-500 font-mono">Live Display Duplicator API</p>
          </div>
        </div>
        
        {isActive ? (
          <button
            onClick={stopCapture}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <Square size={12} fill="currentColor" /> Stop Screen sharing
          </button>
        ) : (
          <button
            onClick={startCapture}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <Play size={12} fill="currentColor" /> Share Real Monitor Screen
          </button>
        )}
      </div>

      {/* Info Popup Tips */}
      {infoPopup && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 p-3.5 rounded-lg text-xs text-indigo-300 relative">
          <button
            onClick={() => setInfoPopup(false)}
            className="absolute top-2 right-2 text-indigo-500 hover:text-indigo-300 cursor-pointer text-sm"
          >
            ×
          </button>
          <p className="font-semibold flex items-center gap-1 mb-1">
            <HelpCircle size={13} /> True Compression Pipeline Simulator
          </p>
          <p className="leading-relaxed text-[11px] text-indigo-400">
            This module activates your browser's physical monitor capture feed. It slices the live video into a grid of region pixels, detects localized color variations ("dirty boxes"), and displays flashing bounding grids dynamically as content changes!
          </p>
        </div>
      )}

      {/* Connection Errors (e.g. sandbox constraint warning) */}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-800/80 p-4 rounded-lg text-xs text-red-400 flex items-start gap-2.5 leading-relaxed">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Display Duplication Capture Error</span>
            <p className="text-red-300">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Render Shared Screen Feed */}
      <div className="relative bg-slate-900 rounded-lg aspect-video w-full flex items-center justify-center border border-slate-800 overflow-hidden">
        {/* Hidden backing video tag feeding stream frame pixels */}
        <video
          ref={videoRef}
          className="hidden"
          muted
          playsInline
        />

        {/* Live Canvas with custom dirty rect overlays painted over it */}
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className={`w-full h-full object-contain ${isActive ? "block" : "hidden"}`}
        />

        {/* Display inactive state banner */}
        {!isActive && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 font-mono">
            <div className="p-3 bg-slate-950 rounded-full border border-slate-800 text-slate-600 animate-pulse">
              <Monitor size={36} />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">DirectX Duplication API Offline</span>
              <p className="text-[10px] text-slate-600 max-w-sm">
                Click "Share Real Monitor Screen" or toggle to "Virtual Workspace" in settings to start capturing remote pixels.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
