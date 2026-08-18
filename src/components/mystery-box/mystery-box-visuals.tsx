/**
 * Shared, literal visual primitives from the approved Figma Mystery
 * Box export (App.tsx — BoxIllustration(), SlotRow()). Used by BOTH
 * the canonical /mystery-boxes page (mystery-box-experience.tsx) and
 * the homepage teaser (mystery-box-home-section.tsx) — one visual
 * source, zero duplicated/drifting copies.
 */
export function BoxIllustration({ isGold, size = 140 }: { isGold: boolean; size?: number }) {
  const bodyColor = isGold ? "#1a1200" : "#111929";
  const lidColor = isGold ? "#2a1e00" : "#192240";
  const glowColor = isGold ? "rgba(240,165,0,0.3)" : "rgba(0,229,160,0.25)";
  const accentColor = isGold ? "#f0a500" : "#00e5a0";
  const lineColor = isGold ? "rgba(240,165,0,0.25)" : "rgba(0,229,160,0.2)";
  const scale = size / 140;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <div style={{ position: "absolute", inset: -10 * scale, borderRadius: "50%", background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, filter: "blur(12px)" }} />
      <div style={{ position: "absolute", bottom: 10 * scale, left: 20 * scale, right: 20 * scale, height: 90 * scale, backgroundColor: bodyColor, borderRadius: "0 0 14px 14px", border: `1px solid ${lineColor}`, borderTop: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 12 * scale, fontWeight: 700, color: accentColor, letterSpacing: "0.15em", opacity: 0.7 }}>SAVO</span>
      </div>
      <div style={{ position: "absolute", top: 12 * scale, left: 12 * scale, right: 12 * scale, height: 42 * scale, backgroundColor: lidColor, borderRadius: 10, border: `1px solid ${lineColor}`, boxShadow: `0 8px 24px ${glowColor}` }} />
      <div style={{ position: "absolute", top: 46 * scale, left: 20 * scale, right: 20 * scale, height: 3, background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`, borderRadius: 2 }} />
    </div>
  );
}

export function SlotRow({ total, mysteryCount, label, slotSize = 32 }: { total: number; mysteryCount: number; label?: string; slotSize?: number }) {
  return (
    <div>
      {label && <p style={{ fontSize: 11, color: "#6b778f", letterSpacing: "0.08em", marginBottom: 8, textAlign: "center" }}>{label}</p>}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        {Array.from({ length: total }).map((_, i) => {
          const isMystery = i < mysteryCount;
          return (
            <div key={i} style={{ width: slotSize, height: slotSize, borderRadius: 8, backgroundColor: isMystery ? "rgba(255,255,255,0.04)" : "rgba(0,229,160,0.08)", border: `1px solid ${isMystery ? "rgba(255,255,255,0.1)" : "rgba(0,229,160,0.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: isMystery ? "#6b778f" : "#00e5a0" }}>
              {isMystery ? "?" : "✓"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
