"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { formatKWD } from "@/lib/utils";

/**
 * SAVO Discovery advertising screen — approved V22 media-screen
 * concept. Real, admin-managed BrandCampaign slides only (HOMEPAGE_BANNER
 * type, active + within schedule, ordered by sortOrder) — zero Figma
 * mock campaign. Price/stock are display TOGGLES on the campaign row;
 * the actual numbers are always the live linked product's real
 * saveoPrice/stockQty, read server-side and passed in as props —
 * never a duplicated/stale campaign-stored price.
 */
export interface DiscoverySlide {
  id: string;
  imageUrl: string | null;
  destinationUrl: string;
  headline: string | null;
  headlineAr: string | null;
  label: string | null;
  labelAr: string | null;
  ctaText: string | null;
  ctaTextAr: string | null;
  brandName: string;
  price: number | null; // already resolved server-side from the real linked product when showPrice=true
  stockQty: number | null; // already resolved server-side when showStockUrgency=true
}

export function DiscoveryAdScreen({ slides, locale }: { slides: DiscoverySlide[]; locale: string }) {
  const isArabic = locale === "ar";
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) {
    // Zero eligible campaigns — real content stays empty (never a
    // fabricated campaign), but the approved V22 layout/proportions
    // must still be visible for verification, per explicit approval.
    return (
      <div className="savo-discoveryad savo-discoveryad--empty">
        <span className="savo-discoveryad-emptylabel">{isArabic ? "اكتشاف سافو" : "SAVO DISCOVERY"}</span>
        <span className="savo-discoveryad-emptytext">{isArabic ? "قريبًا — حملات مختارة من سافو" : "Coming soon — curated SAVO campaigns"}</span>
      </div>
    );
  }

  const slide = slides[index];
  const displayHeadline = isArabic && slide.headlineAr ? slide.headlineAr : slide.headline;
  const displayLabel = isArabic && slide.labelAr ? slide.labelAr : slide.label;
  const displayCta = isArabic && slide.ctaTextAr ? slide.ctaTextAr : slide.ctaText;

  return (
    <div className="savo-discoveryad">
      <Link href={slide.destinationUrl} className="savo-discoveryad-slide">
        {slide.imageUrl ? <img src={slide.imageUrl} alt={displayHeadline ?? slide.brandName} /> : <span className="savo-discoveryad-fallback" />}
        <span className="savo-discoveryad-scrim" />
        <span className="savo-discoveryad-content">
          <small>{isArabic ? "اكتشاف سافو" : "SAVO DISCOVERY"}</small>
          {displayLabel && <em>{displayLabel}</em>}
          <span className="savo-discoveryad-brand">{slide.brandName}</span>
          {displayHeadline && <strong>{displayHeadline}</strong>}
          {slide.price !== null && <span className="savo-discoveryad-price">{formatKWD(slide.price)}</span>}
          {slide.stockQty !== null && slide.stockQty > 0 && (
            <span className="savo-discoveryad-stock">{isArabic ? `متبقي ${slide.stockQty} فقط` : `Only ${slide.stockQty} left`}</span>
          )}
          <span className="savo-discoveryad-cta">{displayCta ?? (isArabic ? "اكتشف ←" : "Discover →")}</span>
        </span>
      </Link>

      {slides.length > 1 && (
        <div className="savo-discoveryad-dots">
          {slides.map((s, i) => (
            <button key={s.id} type="button" aria-label={`Slide ${i + 1}`} className={i === index ? "is-active" : ""} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
