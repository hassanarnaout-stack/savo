"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import { ShoppingCart, Check } from "lucide-react";

const FRAME_COUNT = 12;
const FRAME_STEP_DEG = 360 / FRAME_COUNT; // 30°
const DRAG_SENSITIVITY = 0.6; // px of drag needed to advance rotation
const FRAME_PATHS = Array.from({ length: FRAME_COUNT }, (_, i) => `/demo-360-v2/crystal-noir-v2-${String(i * FRAME_STEP_DEG).padStart(3, "0")}.png`);

/**
 * SAVO SPOTLIGHT — 360° PROTOTYPE, V22 visual parity pass.
 * ============================================================
 * Root cause of the white-background regression (previous round):
 * `.savo-spotlight` never set its own dark background — every sibling
 * homepage section (.savo-hero, .savo-hour, .savo-hub) explicitly sets
 * `background: var(--savo-shell-ink)`, and this one didn't, so the
 * page's default light background showed through. Fixed in globals.css.
 *
 * Still not wired to any product/media/API/schema — 12 static demo
 * frames (v2 set) in /public/demo-360-v2/, static V22 demo content
 * (Crystal Noir Parfum) exactly as it already existed in the V22
 * source, not real store data.
 *
 * "SAVO Story →" from the V22 reference is OMITTED here — verified no
 * real story/about destination exists in production yet (searched
 * `src/app/[locale]` directly). Reported rather than linking to a
 * fabricated route, per instruction.
 *
 * No real product-level rating exists in the schema (verified in an
 * earlier round — avgRating only exists on SupplierPerformanceScore),
 * so the V22 Stars/rating row is correctly omitted, not faked.
 *
 * Add to Cart uses the exact same canonical useCartStore already used
 * everywhere else — no second cart implementation.
 */
export function SAVOSpotlight360() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [framesReady, setFramesReady] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const rotationRef = useRef(0);
  const dragStartXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    FRAME_PATHS.forEach((src) => {
      const img = new window.Image();
      img.onload = () => {
        loaded++;
        if (loaded === FRAME_COUNT && !cancelled) setFramesReady(true);
      };
      img.onerror = () => {
        if (!cancelled) setFrameFailed(true);
      };
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyRotation = useCallback((deltaDeg: number) => {
    rotationRef.current += deltaDeg;
    const normalized = ((Math.round(rotationRef.current / FRAME_STEP_DEG) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    setFrameIndex(normalized);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (frameFailed) return;
    setDragging(true);
    dragStartXRef.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStartXRef.current;
    applyRotation(dx * DRAG_SENSITIVITY);
    dragStartXRef.current = e.clientX;
  }
  function onPointerUp() {
    setDragging(false);
  }

  function handleAddToCart() {
    if (justAdded) return; // guards against a double-fire on one click
    addItem({ productId: "spotlight-demo-crystal-noir", name: "Crystal Noir Parfum — 100ml", slug: "crystal-noir-parfum", image: FRAME_PATHS[0], originalPrice: 34.0, saveoPrice: 24.5, stockQty: 99 }, 1);
    toast.success("Crystal Noir Parfum added to cart");
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  }

  const orbitRotation = (frameIndex / FRAME_COUNT) * 360;
  const activeDegree = frameIndex * FRAME_STEP_DEG;
  const activeFrame = frameFailed ? FRAME_PATHS[0] : FRAME_PATHS[frameIndex];

  return (
    <section className="savo-spotlight">
      <div className="savo-spotlight-head">
        <p className="savo-products-eyebrow">Featured Discovery</p>
        <h2 className="savo-spotlight-title">SAVO Spotlight</h2>
      </div>

      <div
        ref={containerRef}
        className="savo-spotlight-stage"
        style={{ cursor: frameFailed ? "default" : dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <img
          src={activeFrame}
          alt="Crystal Noir Parfum — 360° view"
          draggable={false}
          className="savo-spotlight-img"
          style={{ opacity: framesReady || frameFailed ? 1 : 0 }}
          onError={() => setFrameFailed(true)}
        />
        <div className="savo-spotlight-scrim-side" />
        <div className="savo-spotlight-scrim-bottom" />

        {!frameFailed && (
          <div className="savo-spotlight-orbit">
            <svg width="100%" height="100%" viewBox="0 0 92 92" style={{ transform: `rotate(${orbitRotation}deg)`, transition: dragging ? "none" : "transform .3s ease" }}>
              <circle cx="46" cy="46" r="40" stroke="color-mix(in srgb, var(--savo-shell-discovery) 35%, transparent)" strokeWidth="1.5" fill="none" strokeDasharray="6 4" />
              <circle cx="46" cy="6" r="5" fill="var(--savo-shell-discovery)" />
              <circle cx="46" cy="86" r="3" fill="color-mix(in srgb, var(--savo-shell-discovery) 50%, transparent)" />
              <circle cx="6" cy="46" r="3" fill="color-mix(in srgb, var(--savo-shell-discovery) 50%, transparent)" />
              <circle cx="86" cy="46" r="3" fill="color-mix(in srgb, var(--savo-shell-discovery) 50%, transparent)" />
            </svg>
            <div className="savo-spotlight-orbit-label">
              <span>360°</span>
              <small>{activeDegree}°</small>
            </div>
          </div>
        )}

        {!frameFailed && (
          <div className="savo-spotlight-hint" style={{ opacity: dragging ? 0.5 : 1 }}>
            <span>↔</span>
            <span>Drag to explore</span>
          </div>
        )}

        <div className="savo-spotlight-info">
          <span className="savo-spotlight-chip">✦ SAVO Spotlight</span>
          <h3>Crystal Noir<br />Parfum — 100ml</h3>
          <div className="savo-spotlight-brand">Maison Prestige</div>
          <div className="savo-spotlight-actions">
            <div className="savo-spotlight-price">
              <strong>KD 24.500</strong>
              <del>KD 34.000</del>
              <b>-28%</b>
            </div>
            <button
              type="button"
              className={`savo-spotlight-cta${justAdded ? " is-added" : ""}`}
              onClick={handleAddToCart}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={justAdded ? "Added to cart" : "Add to Cart"}
            >
              {justAdded ? <Check size={15} /> : <ShoppingCart size={15} />}
              {justAdded ? "Added" : "Add to Cart"}
            </button>
          </div>
        </div>

        {!frameFailed && (
          <div className="savo-spotlight-badge">
            <span className="savo-spotlight-badge-dot" />
            SAVO 360° · Drag to explore
          </div>
        )}
      </div>
    </section>
  );
}
