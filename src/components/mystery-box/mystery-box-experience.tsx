"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import type { MysteryTierKey } from "@/lib/mystery-box-tiers";

/**
 * SAVO Mystery Box — approved 2026 Figma experience.
 * ============================================================
 * Visual structure (BoxIllustration, SlotRow, the three screens'
 * exact spacing/colors/typography) is reproduced as directly as
 * practical from the approved Figma export (App.tsx —
 * CollectionScreen/BuildScreenInner/LockedScreen). Real data only:
 * every tier config, choice-pool product, and price comes from real
 * data passed in as props — zero Figma mock products
 * (Sony/Canon/jewelry) migrated.
 *
 * ABSOLUTE RULE: Mystery (LOCKED-pool) products are never fetched,
 * never held in this component's state, never rendered — only their
 * COUNT (tier.mysteryCount) is known client-side. The actual hidden
 * identities are allocated server-side, automatically, at checkout
 * (see src/app/api/checkout/route.ts) — this component never asks for
 * or receives them.
 *
 * "Get This Box" → "Build My Box" per the approved copy change. Gold
 * tier uses the REAL SAVO Plus entitlement (isGoldEligible prop,
 * computed server-side via MembershipService.isActiveMember) — never
 * a fake membership check.
 */

interface TierConfig {
  tierKey: MysteryTierKey;
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  price: number;
  image: string | null;
  mysteryCount: number;
  pickCount: number;
  poolSize: number;
  valueMin: number | null;
  valueMax: number | null;
  inStock: boolean;
  choicePool: { id: string; name: string; nameAr: string | null; brand: string | null; slug: string; image: string | null }[];
}

const TIER_META: Record<MysteryTierKey, { label: string; labelAr: string; accent: string; isGold: boolean; badge: string | null }> = {
  discovery: { label: "SAVO Discovery Box", labelAr: "صندوق SAVO للاكتشاف", accent: "#00e5a0", isGold: false, badge: null },
  premium: { label: "SAVO Premium Box", labelAr: "صندوق SAVO المميز", accent: "#00e5a0", isGold: false, badge: "MOST POPULAR" },
  gold: { label: "SAVO Gold Box", labelAr: "صندوق SAVO الذهبي", accent: "#f0a500", isGold: true, badge: "PLUS EXCLUSIVE" },
};

function BoxIllustration({ isGold }: { isGold: boolean }) {
  const bodyColor = isGold ? "#1a1200" : "#111929";
  const lidColor = isGold ? "#2a1e00" : "#192240";
  const glowColor = isGold ? "rgba(240,165,0,0.3)" : "rgba(0,229,160,0.25)";
  const accentColor = isGold ? "#f0a500" : "#00e5a0";
  const lineColor = isGold ? "rgba(240,165,0,0.25)" : "rgba(0,229,160,0.2)";
  return (
    <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
      <div style={{ position: "absolute", inset: -10, borderRadius: "50%", background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, filter: "blur(12px)" }} />
      <div style={{ position: "absolute", bottom: 10, left: 20, right: 20, height: 90, backgroundColor: bodyColor, borderRadius: "0 0 14px 14px", border: `1px solid ${lineColor}`, borderTop: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: accentColor, letterSpacing: "0.15em", opacity: 0.7 }}>SAVO</span>
      </div>
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, height: 42, backgroundColor: lidColor, borderRadius: 10, border: `1px solid ${lineColor}`, boxShadow: `0 8px 24px ${glowColor}` }} />
      <div style={{ position: "absolute", top: 46, left: 20, right: 20, height: 3, background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`, borderRadius: 2 }} />
    </div>
  );
}

function SlotRow({ total, mysteryCount, label }: { total: number; mysteryCount: number; label?: string }) {
  return (
    <div>
      {label && <p style={{ fontSize: 11, color: "#6b778f", letterSpacing: "0.08em", marginBottom: 8, textAlign: "center" }}>{label}</p>}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        {Array.from({ length: total }).map((_, i) => {
          const isMystery = i < mysteryCount;
          return (
            <div key={i} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isMystery ? "rgba(255,255,255,0.04)" : "rgba(0,229,160,0.08)", border: `1px solid ${isMystery ? "rgba(255,255,255,0.1)" : "rgba(0,229,160,0.35)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: isMystery ? "#6b778f" : "#00e5a0" }}>
              {isMystery ? "?" : "✓"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Screen = "collection" | "build" | "locked";

export function MysteryBoxExperience({ tiers, isGoldEligible, locale }: { tiers: Record<MysteryTierKey, TierConfig | null>; isGoldEligible: boolean; locale: string }) {
  const router = useRouter();
  const isArabic = locale === "ar";
  const [screen, setScreen] = useState<Screen>("collection");
  const [activeTier, setActiveTier] = useState<MysteryTierKey | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  const tierList = (Object.keys(TIER_META) as MysteryTierKey[]).filter((k) => tiers[k]);
  if (tierList.length === 0) return null;

  function selectBox(tierKey: MysteryTierKey) {
    if (tierKey === "gold" && !isGoldEligible) {
      router.push(`/${locale}/membership`);
      return;
    }
    setActiveTier(tierKey);
    setSelected([]);
    setScreen("build");
  }

  function toggle(id: string, pickCount: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= pickCount) return prev;
      return [...prev, id];
    });
  }

  function handleAddToCart(tier: TierConfig) {
    addItem(
      {
        productId: tier.id,
        name: tier.name,
        slug: tier.slug,
        image: tier.image,
        originalPrice: tier.price,
        saveoPrice: tier.price,
        stockQty: tier.inStock ? 99 : 0,
        mysteryBoxChoiceIds: selected,
      },
      1
    );
    toast.success(isArabic ? "أُضيف الصندوق للسلة" : "Box added to cart");
    setScreen("collection");
    setActiveTier(null);
    setSelected([]);
  }

  if (screen === "collection") {
    return (
      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "72px 24px 80px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#00e5a0", letterSpacing: "0.14em", marginBottom: 14 }}>{isArabic ? "سافو الغامض" : "SAVO MYSTERY"}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 4.5vw, 58px)", fontWeight: 800, color: "#f0f2f7", margin: "0 0 52px", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          {isArabic ? "ترقّب. غموض. قيمة." : "Anticipation. Mystery. Value."}
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {tierList.map((tierKey) => {
            const tier = tiers[tierKey]!;
            const meta = TIER_META[tierKey];
            const isGold = meta.isGold;
            const cta = isGold ? (isArabic ? "انضم لـ SAVO Plus للفتح" : "Join SAVO Plus to Unlock") : isArabic ? "ابنِ صندوقي" : "Build My Box";
            return (
              <div key={tierKey} style={{ backgroundColor: isGold ? "#0f0a00" : "#0f1420", border: `1px solid ${isGold ? "rgba(240,165,0,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, padding: "36px 28px 32px", position: "relative", display: "flex", flexDirection: "column" }}>
                {meta.badge && (
                  <div style={{ position: "absolute", top: 20, insetInlineEnd: 20, fontSize: 10, fontWeight: 700, color: isGold ? "#f0a500" : "#00e5a0", backgroundColor: isGold ? "rgba(240,165,0,0.12)" : "rgba(0,229,160,0.08)", border: `1px solid ${isGold ? "rgba(240,165,0,0.3)" : "rgba(0,229,160,0.22)"}`, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.1em" }}>
                    {isGold ? `+ ${meta.badge}` : meta.badge}
                  </div>
                )}
                <BoxIllustration isGold={isGold} />
                <p style={{ fontSize: 11, fontWeight: 700, color: isGold ? "#f0a500" : "#00e5a0", letterSpacing: "0.12em", textAlign: "center", margin: "20px 0 8px" }}>{isArabic ? "6 منتجات بالداخل" : "6 PRODUCTS INSIDE"}</p>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#f0f2f7", textAlign: "center", margin: "0 0 20px", letterSpacing: "-0.01em" }}>
                  {isArabic ? meta.labelAr : meta.label}
                </h2>
                <div style={{ marginBottom: 20 }}>
                  <SlotRow total={6} mysteryCount={tier.mysteryCount} />
                </div>
                <div style={{ backgroundColor: isGold ? "rgba(240,165,0,0.06)" : "rgba(0,229,160,0.05)", border: `1px solid ${isGold ? "rgba(240,165,0,0.15)" : "rgba(0,229,160,0.12)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: isGold ? "#f0a500" : "#00e5a0", margin: "0 0 6px", letterSpacing: "0.04em" }}>{tier.mysteryCount} {isArabic ? "قطعة غامضة" : "MYSTERY PICKS"}</p>
                  <p style={{ fontSize: 14, color: "#8b95a8", margin: "0 0 6px", fontWeight: 600 }}>+ {isArabic ? `تختار ${tier.pickCount}` : `YOU CHOOSE ${tier.pickCount}`}</p>
                  <p style={{ fontSize: 13, color: "#6b778f", margin: 0 }}>{isArabic ? `اختر ${tier.pickCount} من ${tier.poolSize} منتجات مختارة.` : `Choose ${tier.pickCount} from ${tier.poolSize} curated products.`}</p>
                </div>
                <div style={{ marginBottom: 20, marginTop: "auto" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 800, color: "#f0f2f7", textAlign: "center", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{formatKWD(tier.price)}</p>
                  {tier.valueMax && <p style={{ fontSize: 13, color: isGold ? "#f0a500" : "#00e5a0", textAlign: "center", margin: 0 }}>{isArabic ? `قيمة تصل إلى ${formatKWD(tier.valueMax)}` : `Value up to ${formatKWD(tier.valueMax)}`}</p>}
                </div>
                <button
                  onClick={() => selectBox(tierKey)}
                  disabled={!tier.inStock}
                  style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: tier.inStock ? "pointer" : "not-allowed", fontSize: 15, fontWeight: 700, letterSpacing: "0.02em", backgroundColor: !tier.inStock ? "rgba(255,255,255,0.06)" : isGold ? "#f0a500" : "#00e5a0", color: !tier.inStock ? "#3d4a5f" : "#090b10" }}
                >
                  {!tier.inStock ? (isArabic ? "نفدت الكمية" : "Sold Out") : cta}
                </button>
                {isGold && !isGoldEligible && (
                  <p style={{ textAlign: "center", fontSize: 13, color: "#6b778f", margin: "12px 0 0" }}>{isArabic ? "متاح فقط لأعضاء SAVO Plus" : "SAVO Plus members only"}</p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  if (screen === "build" && activeTier) {
    const tier = tiers[activeTier]!;
    const meta = TIER_META[activeTier];
    const isGold = meta.isGold;
    const accentColor = meta.accent;
    const canLock = selected.length === tier.pickCount;
    const remaining = tier.pickCount - selected.length;
    const selectedProducts = tier.choicePool.filter((p) => selected.includes(p.id));

    return (
      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "48px 24px 100px" }}>
        <button onClick={() => setScreen("collection")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b778f", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 36, padding: 0 }}>
          {isArabic ? "→ رجوع لصناديق الغموض" : "← Back to Mystery Boxes"}
        </button>
        <p style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.14em", marginBottom: 10 }}>{(isArabic ? meta.labelAr : meta.label).toUpperCase()}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 800, color: "#f0f2f7", margin: "0 0 8px", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {isArabic ? "ابنِ صندوق الغموض الخاص فيك" : "BUILD YOUR MYSTERY BOX"}
        </h1>
        <p style={{ fontSize: 16, color: "#6b778f", margin: "0 0 52px" }}>
          {isArabic ? `تختار ${tier.pickCount}. ` : `You choose ${tier.pickCount}. `}
          <span style={{ color: "#8b95a8" }}>{isArabic ? `وسافو تفاجئك بـ ${tier.mysteryCount}.` : `SAVO surprises you with ${tier.mysteryCount}.`}</span>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 32, alignItems: "start" }}>
          <div>
            <section style={{ marginBottom: 52 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.12em", margin: "0 0 6px" }}>{isArabic ? "القطع الغامضة" : "MYSTERY PICKS"}</p>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#f0f2f7", margin: 0 }}>{tier.mysteryCount} {isArabic ? "قطعة غامضة" : `Mystery Pick${tier.mysteryCount !== 1 ? "s" : ""}`}</h2>
                </div>
                <p style={{ fontSize: 12, color: "#4a5568", maxWidth: 200, textAlign: "right", lineHeight: 1.5, margin: 0 }}>{isArabic ? "تبقى سرّية حتى يوصلك صندوق SAVO." : "These stay secret until your SAVO box arrives."}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${tier.mysteryCount}, 1fr)`, gap: 12 }}>
                {Array.from({ length: tier.mysteryCount }).map((_, i) => (
                  <div key={i} style={{ backgroundColor: "#0f1420", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 130 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#2a3347" }}>?</div>
                    <span style={{ fontSize: 10, color: "#2a3347", letterSpacing: "0.1em", fontWeight: 600 }}>{isArabic ? "غامض" : "MYSTERY"}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#2a3347", marginTop: 12, letterSpacing: "0.06em", textAlign: "center" }}>{isArabic ? "بعض الأشياء أفضل أن تبقى مغلقة." : "SOME THINGS ARE BETTER LEFT UNOPENED."}</p>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.12em", margin: "0 0 6px" }}>{isArabic ? "اختياراتك" : "YOUR PICKS"}</p>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#f0f2f7", margin: 0 }}>{isArabic ? `اختر ${tier.pickCount} من ${tier.poolSize}` : `Choose ${tier.pickCount} of ${tier.poolSize}`}</h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: "#0f1420", border: `1px solid ${canLock ? `${accentColor}55` : "rgba(255,255,255,0.08)"}`, borderRadius: 30, padding: "8px 16px" }}>
                  {Array.from({ length: tier.pickCount }).map((_, i) => (
                    <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: selected.length > i ? accentColor : "rgba(255,255,255,0.08)" }} />
                  ))}
                  <span style={{ fontSize: 13, fontWeight: 600, color: canLock ? accentColor : "#6b778f" }}>{selected.length} / {tier.pickCount} {isArabic ? "محدد" : "SELECTED"}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
                {tier.choicePool.map((product) => {
                  const isSelected = selected.includes(product.id);
                  const isDisabled = !isSelected && selected.length >= tier.pickCount;
                  const displayName = isArabic && product.nameAr ? product.nameAr : product.name;
                  return (
                    <button key={product.id} onClick={() => toggle(product.id, tier.pickCount)} disabled={isDisabled} style={{ background: "none", padding: 0, border: "none", cursor: isDisabled ? "not-allowed" : "pointer", textAlign: "left", borderRadius: 16, opacity: isDisabled ? 0.35 : 1 }}>
                      <div style={{ backgroundColor: "#0f1420", border: `1px solid ${isSelected ? `${accentColor}80` : "rgba(255,255,255,0.07)"}`, borderRadius: 16, overflow: "hidden", boxShadow: isSelected ? `0 0 20px ${accentColor}22` : "none" }}>
                        <div style={{ position: "relative", height: 160, backgroundColor: "#131929" }}>
                          <img src={product.image ?? "/placeholder-product.svg"} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          {isSelected && (
                            <div style={{ position: "absolute", inset: 0, backgroundColor: `${accentColor}18`, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 10 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#090b10" }}>✓</div>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: "14px" }}>
                          {product.brand && <p style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: "0.1em", margin: "0 0 4px" }}>{product.brand}</p>}
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#f0f2f7", margin: "0 0 10px", lineHeight: 1.3 }}>{displayName}</p>
                          <p style={{ fontSize: 10, fontWeight: 600, color: isSelected ? accentColor : "#3d4a5f", letterSpacing: "0.08em", margin: 0 }}>{isSelected ? (isArabic ? "اختيارك" : "YOUR PICK") : isArabic ? "ضمن الصندوق" : "INCLUDED IN BOX"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div style={{ position: "sticky", top: 84 }}>
            <div style={{ backgroundColor: isGold ? "#0f0a00" : "#0f1420", border: `1px solid ${isGold ? "rgba(240,165,0,0.15)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${isGold ? "rgba(240,165,0,0.1)" : "rgba(255,255,255,0.06)"}`, backgroundColor: isGold ? "#140e00" : "#111829" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.12em", margin: "0 0 4px" }}>{isArabic ? "صندوقك من SAVO" : "YOUR SAVO BOX"}</p>
                <p style={{ fontSize: 13, color: "#6b778f", margin: 0 }}>{isArabic ? "6 منتجات · معاينة حيّة" : "6 products · Live preview"}</p>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <p style={{ fontSize: 11, color: "#2a3347", letterSpacing: "0.08em", margin: "0 0 10px" }}>{tier.mysteryCount} {isArabic ? "قطعة غامضة" : `MYSTERY PICK${tier.mysteryCount !== 1 ? "S" : ""}`}</p>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${tier.mysteryCount}, 1fr)`, gap: 8, marginBottom: 16 }}>
                  {Array.from({ length: tier.mysteryCount }).map((_, i) => (
                    <div key={i} style={{ aspectRatio: "1", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#2a3347" }}>?</div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: accentColor, letterSpacing: "0.08em", margin: "0 0 10px", opacity: 0.6 }}>{tier.pickCount} {isArabic ? "اختياراتك" : `YOUR PICK${tier.pickCount !== 1 ? "S" : ""}`}</p>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(tier.pickCount, 4)}, 1fr)`, gap: 8, marginBottom: 20 }}>
                  {Array.from({ length: tier.pickCount }).map((_, i) => {
                    const p = selectedProducts[i];
                    return (
                      <div key={i} style={{ aspectRatio: "1", backgroundColor: p ? "#131929" : `${accentColor}08`, border: `1px solid ${p ? `${accentColor}40` : `${accentColor}15`}`, borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p ? <img src={p.image ?? "/placeholder-product.svg"} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18, color: `${accentColor}25` }}>+</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: "#6b778f", margin: "0 0 4px" }}>{tier.mysteryCount} {isArabic ? "غامض" : "Mystery"} · {selected.length} {isArabic ? "من" : "of"} {tier.pickCount} {isArabic ? "" : "Picks"}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 12, color: "#4a5568" }}>{isArabic ? "6 منتجات إجمالًا" : "6 Products Total"}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#f0f2f7" }}>{formatKWD(tier.price)}</span>
                  </div>
                </div>
                <button
                  onClick={() => { if (canLock) setScreen("locked"); }}
                  style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: canLock ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, letterSpacing: "0.07em", backgroundColor: canLock ? accentColor : "rgba(255,255,255,0.04)", color: canLock ? "#090b10" : "#3d4a5f", marginBottom: 10 }}
                >
                  {isArabic ? "أقفل صندوقي" : "LOCK MY BOX"}
                </button>
                <p style={{ fontSize: 11, textAlign: "center", margin: 0, letterSpacing: "0.06em", color: canLock ? accentColor : "#2a3347" }}>
                  {canLock ? (isArabic ? "اختياراتك. مفاجأتنا." : "YOUR PICKS. OUR SURPRISE.") : isArabic ? `اختر ${remaining} منتج إضافي` : `SELECT ${remaining} MORE PRODUCT${remaining !== 1 ? "S" : ""}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "locked" && activeTier) {
    const tier = tiers[activeTier]!;
    const meta = TIER_META[activeTier];
    const isGold = meta.isGold;
    const accentColor = meta.accent;
    const selectedProducts = tier.choicePool.filter((p) => selected.includes(p.id));

    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px 100px", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", boxShadow: `0 0 40px ${accentColor}20`, fontSize: 32 }}>🔒</div>
        <p style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.14em", marginBottom: 12 }}>{isArabic ? "أكمل اللحظة" : "COMPLETE THE MOMENT"}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, color: "#f0f2f7", margin: "0 0 16px", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {isArabic ? "صندوقك من SAVO مقفل الآن" : "YOUR SAVO BOX IS LOCKED"}
        </h1>
        <p style={{ fontSize: 16, color: "#6b778f", margin: "0 0 52px", lineHeight: 1.6 }}>
          {isArabic ? `${tier.mysteryCount} مفاجأة + ${tier.pickCount} من اختياراتك.` : `${tier.mysteryCount} surprise${tier.mysteryCount !== 1 ? "s" : ""} + ${tier.pickCount} of your pick${tier.pickCount !== 1 ? "s" : ""}.`}
          <br />
          <span style={{ color: "#4a5568" }}>{isArabic ? "الغموض يسافر مع صندوقك." : "The mystery travels with your box."}</span>
        </p>

        <div style={{ backgroundColor: isGold ? "#0f0a00" : "#0f1420", border: `1px solid ${accentColor}25`, borderRadius: 20, padding: "32px", marginBottom: 36, boxShadow: `0 0 60px ${accentColor}10` }}>
          <p style={{ fontSize: 11, color: "#6b778f", letterSpacing: "0.1em", marginBottom: 20 }}>{isArabic ? "داخل صندوقك" : "INSIDE YOUR BOX"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
            {Array.from({ length: tier.mysteryCount }).map((_, i) => (
              <div key={i} style={{ aspectRatio: "1", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#2a3347" }}>?</div>
            ))}
            {selectedProducts.map((p) => (
              <div key={p.id} style={{ aspectRatio: "1", backgroundColor: "#131929", border: `1px solid ${accentColor}40`, borderRadius: 12, overflow: "hidden", boxShadow: `0 0 12px ${accentColor}15` }}>
                <img src={p.image ?? "/placeholder-product.svg"} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 12, color: "#6b778f", margin: "0 0 4px" }}>{tier.mysteryCount} {isArabic ? "قطعة غامضة" : `Mystery Pick${tier.mysteryCount !== 1 ? "s" : ""}`} · {tier.pickCount} {isArabic ? "اختيارك" : `Your Pick${tier.pickCount !== 1 ? "s" : ""}`}</p>
              <p style={{ fontSize: 12, color: "#3d4a5f" }}>{isArabic ? "الغموض يبقى سرًا حتى يصلك." : "THE MYSTERY STAYS SECRET UNTIL IT REACHES YOU."}</p>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "#f0f2f7" }}>{formatKWD(tier.price)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => handleAddToCart(tier)} style={{ width: "100%", padding: "18px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", backgroundColor: accentColor, color: "#090b10", boxShadow: `0 0 32px ${accentColor}40` }}>
            {isArabic ? "أضف للسلة" : "ADD TO CART"}
          </button>
          <button onClick={() => setScreen("collection")} style={{ width: "100%", padding: "16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 14, fontWeight: 600, letterSpacing: "0.04em", backgroundColor: "transparent", color: "#6b778f" }}>
            {isArabic ? "متابعة التسوق" : "CONTINUE SHOPPING"}
          </button>
        </div>
      </main>
    );
  }

  return null;
}
