"use client";

import { useRef } from "react";

/**
 * Saveo Aura™ batch 2 — genuine cursor-tracking dynamic light.
 * Sets --aura-x/--aura-y CSS custom properties directly on the DOM node
 * from real mousemove coordinates (percentage within the element), which
 * globals.css's .aura-glow-surface radial-gradient reads. No React state/
 * re-render per mouse move — direct style mutation only, so this stays
 * smooth even on cheap hardware.
 */
export function AuraGlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--aura-x", `${x}%`);
    el.style.setProperty("--aura-y", `${y}%`);
  }

  return (
    <div ref={ref} onMouseMove={handleMouseMove} className={`aura-glow-surface ${className}`}>
      {children}
    </div>
  );
}
