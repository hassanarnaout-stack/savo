"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, RotateCw, X, Expand } from "lucide-react";
import type { ProductMediaType } from "@prisma/client";

interface MediaItem {
  id: string;
  type: ProductMediaType;
  url: string;
}

export function PremiumProductGallery({ media, fallbackImage, productName, discountPct }: { media: MediaItem[]; fallbackImage: string | null; productName: string; discountPct?: number }) {
  const items = media.length > 0 ? media : fallbackImage ? [{ id: "fallback", type: "MAIN_IMAGE" as const, url: fallbackImage }] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (items.length === 0) {
    return <div className="savo-pdp-gallery-inner"><div className="savo-pdp-gallery-main" /></div>;
  }

  const active = items[activeIndex];

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
        className="savo-pdp-gallery-main"
        onClick={() => active.type !== "VIDEO" && setFullscreen(true)}
        role={active.type !== "VIDEO" ? "button" : undefined}
        aria-label={active.type !== "VIDEO" ? "View full size" : undefined}
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
            className="savo-pdp-gallery-img object-cover"
          />
        )}
        <div className="savo-pdp-gallery-gradient" />
        {!!discountPct && discountPct > 0 && <span className="savo-pdp-gallery-discount">-{discountPct}%</span>}
        {active.type === "IMAGE_360" && <span className="savo-pdp-gallery-tag"><RotateCw size={12} /> 360°</span>}
        {active.type === "LIFESTYLE_IMAGE" && <span className="savo-pdp-gallery-tag">Lifestyle</span>}
        {active.type !== "VIDEO" && <span className="savo-pdp-gallery-expand"><Expand size={13} /></span>}
      </div>

      {fullscreen && active.type !== "VIDEO" && (
        <div className="savo-pdp-gallery-lightbox" onClick={() => setFullscreen(false)}>
          <button className="savo-pdp-gallery-lightbox-close" onClick={() => setFullscreen(false)} aria-label="Close">
            <X size={20} />
          </button>
          <div className="savo-pdp-gallery-lightbox-frame">
            <Image src={active.url} alt={productName} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
