"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Maximize2, RotateCw } from "lucide-react";

export function Product360Viewer({ frames }: { frames: { url: string }[] }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const dragging = useRef(false);
  const lastX = useRef(0);

  const handleMove = useCallback((clientX: number) => {
    if (!dragging.current) return;
    const delta = clientX - lastX.current;
    if (Math.abs(delta) > 8) {
      setFrameIndex((i) => {
        const step = delta > 0 ? -1 : 1;
        return (i + step + frames.length) % frames.length;
      });
      lastX.current = clientX;
    }
  }, [frames.length]);

  if (frames.length === 0) return null;

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex items-center justify-center bg-black/90" : "relative"}>
      <div
        className={`relative select-none overflow-hidden rounded-xl2 bg-black/5 ${fullscreen ? "h-[80vh] w-[80vw]" : "aspect-square w-full"}`}
        onMouseDown={(e) => { dragging.current = true; lastX.current = e.clientX; }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onTouchStart={(e) => { dragging.current = true; lastX.current = e.touches[0].clientX; }}
        onTouchEnd={() => { dragging.current = false; }}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      >
        <Image src={frames[frameIndex].url} alt="360 view" fill className="pointer-events-none object-contain" priority />
        <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
          <RotateCw className="h-3.5 w-3.5" />
          Drag to rotate
        </div>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="absolute top-3 end-3 rounded-full bg-black/60 p-2 text-white"
          aria-label="Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
