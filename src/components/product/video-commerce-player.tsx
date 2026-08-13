"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

export function VideoCommercePlayer({ videos }: { videos: { url: string }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (videos.length === 0) return null;

  return (
    <div ref={containerRef} className="relative mx-auto aspect-[9/16] max-w-xs overflow-hidden rounded-xl2 bg-black">
      <video
        ref={videoRef}
        src={videos[activeIndex].url}
        muted={muted}
        loop
        playsInline
        className="h-full w-full object-cover"
        onClick={() => {
          if (videoRef.current?.paused) { videoRef.current.play(); setPlaying(true); }
          else { videoRef.current?.pause(); setPlaying(false); }
        }}
      />
      {!playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="h-12 w-12 text-white/90" fill="currentColor" />
        </div>
      )}
      <button
        onClick={() => setMuted(!muted)}
        className="absolute bottom-3 end-3 rounded-full bg-black/50 p-2 text-white"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      {videos.length > 1 && (
        <div className="absolute top-3 start-1/2 flex -translate-x-1/2 gap-1">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1 w-6 rounded-full ${i === activeIndex ? "bg-white" : "bg-white/30"}`}
              aria-label={`Video ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
