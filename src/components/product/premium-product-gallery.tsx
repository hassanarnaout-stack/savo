"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Play, RotateCw } from "lucide-react";
import type { ProductMediaType } from "@prisma/client";

interface MediaItem {
  id: string;
  type: ProductMediaType;
  url: string;
}

export function PremiumProductGallery({ media, fallbackImage, productName }: { media: MediaItem[]; fallbackImage: string | null; productName: string }) {
  const items = media.length > 0 ? media : fallbackImage ? [{ id: "fallback", type: "MAIN_IMAGE" as const, url: fallbackImage }] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return <div className="pdp-gallery-sticky"><div className="pdp-gallery-frame" /></div>;
  }

  const active = items[activeIndex];

  function handleMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  return (
    <div className="pdp-gallery-sticky">
      {/* Main viewer — Smart Zoom on hover for images, native player for video */}
      <div
        ref={containerRef}
        className="pdp-gallery-frame"
        onMouseEnter={() => active.type !== "VIDEO" && setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMouseMove}
      >
        {active.type === "VIDEO" ? (
          <video src={active.url} controls className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full bg-cover bg-no-repeat transition-transform duration-150"
            style={{
              backgroundImage: `url(${active.url})`,
              backgroundPosition: zooming ? `${zoomPos.x}% ${zoomPos.y}%` : "center",
              backgroundSize: zooming ? "200%" : "cover",
            }}
            role="img"
            aria-label={productName}
          />
        )}
        {active.type === "IMAGE_360" && (
          <span className="absolute bottom-3 start-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
            <RotateCw className="h-3 w-3" /> 360°
          </span>
        )}
        {active.type === "LIFESTYLE_IMAGE" && (
          <span className="absolute bottom-3 start-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
            Lifestyle
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="pdp-gallery-thumbs">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(i)}
              className={i === activeIndex ? "is-active" : ""}
            >
              {item.type === "VIDEO" ? (
                <div className="flex h-full w-full items-center justify-center bg-black/80">
                  <Play className="h-5 w-5 text-white" />
                </div>
              ) : (
                <Image src={item.url} alt="" fill sizes="64px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
