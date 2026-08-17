"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * PDP rail navigation affordance — wraps the existing server-rendered
 * .savo-pdprail-row (children) with a right-edge fade hint (CSS-only,
 * see .savo-pdprail-wrap::after) and two arrow buttons that scroll the
 * SAME row by one card width. Does not touch PdpRailCard, the
 * recommendation services, or the row's own scroll-snap behavior —
 * clicking an arrow just does what a manual swipe/drag already does.
 * Mobile keeps relying on native touch swipe (arrows hidden there via
 * CSS — the fade hint is enough affordance on touch devices).
 */
export function PdpRailNav({ children }: { children: React.ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const row = rowRef.current;
    if (!row) return;
    const card = row.querySelector<HTMLElement>(".savo-pdprail-card");
    const step = (card?.offsetWidth ?? 200) + 16; // card width + gap
    row.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <div className="savo-pdprail-wrap">
      <div ref={rowRef} className="savo-pdprail-row">
        {children}
      </div>
      <button type="button" onClick={() => scrollByCard(-1)} className="savo-pdprail-nav savo-pdprail-nav--prev" aria-label="Scroll left">
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={() => scrollByCard(1)} className="savo-pdprail-nav savo-pdprail-nav--next" aria-label="Scroll right">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
