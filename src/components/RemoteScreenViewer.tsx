import React, { useRef, useEffect } from 'react';

interface RemoteScreenViewerProps {
  stream: MediaStream | null;
  onInputEvent?: (event: any) => void;
}

export const RemoteScreenViewer: React.FC<RemoteScreenViewerProps> = ({ 
  stream, 
  onInputEvent 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Calculate mouse position relative to video
  const getRelativePosition = (e: React.MouseEvent) => {
    if (!containerRef.current || !videoRef.current) return { x: 0, y: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const videoRect = videoRef.current.getBoundingClientRect();
    
    const x = (e.clientX - videoRect.left) / videoRect.width;
    const y = (e.clientY - videoRect.top) / videoRect.height;
    
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);
    onInputEvent?.({ type: 'mousemove', x: pos.x, y: pos.y });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);
    onInputEvent?.({ type: 'mousedown', button: e.button, x: pos.x, y: pos.y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);
    onInputEvent?.({ type: 'mouseup', button: e.button, x: pos.x, y: pos.y });
  };

  const handleWheel = (e: React.WheelEvent) => {
    onInputEvent?.({ type: 'wheel', deltaY: e.deltaY });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onInputEvent?.({ 
      type: 'keydown', 
      key: e.key, 
      code: e.code, 
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey
    });
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    onInputEvent?.({ 
      type: 'keyup', 
      key: e.key, 
      code: e.code, 
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey
    });
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <div className="flex justify-between items-center border-b border-slate-900 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Remote Screen</h3>
          <p className="text-[10px] text-slate-500 font-mono">Live WebRTC Stream</p>
        </div>
      </div>

      <div 
        className="relative bg-slate-900 rounded-lg aspect-video w-full flex items-center justify-center border border-slate-800 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {stream ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 font-mono">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">No Remote Stream</p>
          </div>
        )}
      </div>
    </div>
  );
};
