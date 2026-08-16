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

export function PremiumProductGallery({ media, fallbackImage, productName, discountPct }: { media: MediaItem[]; fallbackImage: string | null; productName: string; discountPct?: number }) {
  const items = media.length > 0 ? media : fallbackImage ? [{ id: "fallback", type: "MAIN_IMAGE" as const, url: fallbackImage }] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return <div className="savo-pdp-gallery-inner"><div className="savo-pdp-gallery-main" /></div>;
  }

  const active = items[activeIndex];

  function handleMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  }

  return (
    <div className="savo-pdp-gallery-inner">
      {items.length > 1 && (
        <div className="savo-pdp-gallery-thumbs">
          {items.map((item, i) => (
            <button key={item.id} onClick={() => setActiveIndex(i)} className={i === activeIndex ? "is-active" : ""}>
              {item.type === "VIDEO" ? (
                <span className="savo-pdp-gallery-thumb-video"><Play size={16} /></span>
              ) : (
                <Image src={item.url} alt="" fill sizes="72px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="savo-pdp-gallery-main"
        onMouseEnter={() => active.type !== "VIDEO" && setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMouseMove}
      >
        {active.type === "VIDEO" ? (
          <video src={active.url} controls className="savo-pdp-gallery-video" />
        ) : (
          <Image
            src={active.url}
            alt={productName}
            fill
            sizes="(max-width: 900px) 100vw, 560px"
            priority={activeIndex === 0}
            className="object-cover"
            style={{ transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: zooming ? "scale(2)" : "scale(1)", transition: "transform .15s" }}
          />
        )}
        <div className="savo-pdp-gallery-gradient" />
        {!!discountPct && discountPct > 0 && <span className="savo-pdp-gallery-discount">-{discountPct}%</span>}
        {active.type === "IMAGE_360" && <span className="savo-pdp-gallery-tag"><RotateCw size={12} /> 360°</span>}
        {active.type === "LIFESTYLE_IMAGE" && <span className="savo-pdp-gallery-tag">Lifestyle</span>}
      </div>
    </div>
  );
}
