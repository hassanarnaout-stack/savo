"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatKWD, calcDiscountPct } from "@/lib/utils";
import type { HomeProduct } from "@/lib/homepage-view-model";

const ROTATE_MS = 5000;

/**
 * Homepage Hero — right side "Discovery Display" (V22 HeroDisplay
 * pattern: src/App.tsx, savo-new). ONE large feature card + a
 * thumbnail row below, now with automatic rotation (SAVO behavioral
 * enhancement over V22's literal source — approved).
 *
 * Real data only — HomeProduct has no rating/review field, so rating
 * is never rendered here. Brand falls back to category when a product
 * has no real brandName.
 *
 * Deliberate adaptations from literal V22 (both explicitly instructed
 * across two rounds): no mouse-follow/parallax; thumbnails render as a
 * real row below the card, not dots overlaid on the image.
 *
 * Rotation is a small client-side controller around the SAME
 * server-provided `products` array — zero new fetching, zero new
 * product-selection logic.
 */
export function HeroDiscoveryDisplay({ products, locale }: { products: HomeProduct[]; locale: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cycleKey, setCycleKey] = useState(0); // bump to restart the progress-bar CSS animation
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setActive(((index % products.length) + products.length) % products.length);
      setCycleKey((k) => k + 1);
    },
    [products.length]
  );

  useEffect(() => {
    if (paused || reducedMotion || products.length <= 1) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => goTo(active + 1), ROTATE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, paused, reducedMotion, products.length, goTo]);

  if (products.length === 0) return null;

  const item = products[active];
  const isArabic = locale === "ar";
  const displayName = isArabic && item.nameAr ? item.nameAr : item.name;
  const discountPct = calcDiscountPct(item.originalPrice, item.price);

  return (
    <div
      className="savo-hero-display"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Link href={`/products/${item.slug}`} className="savo-hero-display-card">
        <div key={item.id} className={reducedMotion ? "savo-hero-display-frame" : "savo-hero-display-frame is-animated"}>
          {item.image ? (
            <Image src={item.image} alt={displayName} fill sizes="(max-width: 900px) 90vw, 480px" priority className="savo-hero-display-img" />
          ) : (
            <div className="savo-hero-display-fallback" />
          )}
        </div>
        <div className="savo-hero-display-scrim" />
        {discountPct > 0 && <span className="savo-hero-display-badge">-{discountPct}%</span>}
        <div className="savo-hero-display-info">
          <span className="savo-hero-display-brand">{item.brand ?? item.category}</span>
          <h3>{displayName}</h3>
          <div className="savo-hero-display-price">
            <strong>{formatKWD(item.price)}</strong>
            {item.originalPrice > item.price && <del>{formatKWD(item.originalPrice)}</del>}
          </div>
        </div>
        {!reducedMotion && products.length > 1 && (
          <div className="savo-hero-progress" aria-hidden="true">
            <div key={cycleKey} className={`savo-hero-progress-bar${paused ? " is-paused" : ""}`} />
          </div>
        )}
      </Link>

      {products.length > 1 && (
        <div className="savo-hero-thumbs" role="tablist" aria-label={isArabic ? "منتجات مميزة" : "Featured products"}>
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`savo-hero-thumb${i === active ? " is-active" : ""}`}
              onClick={() => goTo(i)}
            >
              {p.image ? <Image src={p.image} alt="" fill sizes="64px" className="object-cover" /> : <span className="savo-hero-thumb-fallback" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
