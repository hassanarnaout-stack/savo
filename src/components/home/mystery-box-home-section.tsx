import { Link } from "@/i18n/routing";
import { formatKWD } from "@/lib/utils";
import { BoxIllustration, SlotRow } from "@/components/mystery-box/mystery-box-visuals";
import type { MysteryTierKey } from "@/lib/mystery-box-tiers";

/**
 * Homepage Mystery Box section — the literal approved Figma
 * CollectionScreen card (App.tsx), ported directly, not a simplified
 * derivative. Same BoxIllustration, same full-size ? / ✓ SlotRow,
 * same badges, same mechanic copy, same dark card system as the
 * canonical /mystery-boxes page — because both now import the SAME
 * mystery-box-visuals.tsx primitives (zero drift between the two).
 *
 * Real SAVO data only (getMysteryBoxTierConfigs, same source as the
 * canonical page) — zero Figma mock prices. Every card links to the
 * canonical /mystery-boxes page (where the real Build/Lock flow and
 * real SAVO Plus gate live) rather than re-implementing the builder
 * here.
 */
const TIER_META: Record<MysteryTierKey, { label: string; labelAr: string; isGold: boolean; badge: string | null; mechanicLabel: string; mechanicLabelAr: string }> = {
  discovery: { label: "SAVO Discovery Box", labelAr: "صندوق SAVO للاكتشاف", isGold: false, badge: null, mechanicLabel: "MYSTERY PICKS", mechanicLabelAr: "قطعة غامضة" },
  premium: { label: "SAVO Premium Box", labelAr: "صندوق SAVO المميز", isGold: false, badge: "MOST POPULAR", mechanicLabel: "MYSTERY PICKS", mechanicLabelAr: "قطعة غامضة" },
  gold: { label: "SAVO Gold Box", labelAr: "صندوق SAVO الذهبي", isGold: true, badge: "PLUS EXCLUSIVE", mechanicLabel: "MYSTERY PICKS", mechanicLabelAr: "قطعة غامضة" },
};

interface TierConfig {
  tierKey: MysteryTierKey;
  price: number;
  mysteryCount: number;
  pickCount: number;
  poolSize: number;
  valueMax: number | null;
  inStock: boolean;
}

export function MysteryBoxHomeSection({ tiers, locale }: { tiers: Record<MysteryTierKey, TierConfig | null>; locale: string }) {
  const isArabic = locale === "ar";
  const tierList = (Object.keys(TIER_META) as MysteryTierKey[]).filter((k) => tiers[k]);
  if (tierList.length === 0) return null;

  return (
    <section style={{ padding: "0 56px 56px", background: "var(--savo-shell-ink)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div>
          <p className="savo-products-eyebrow">{isArabic ? "سافو الغامض" : "SAVO MYSTERY"}</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 27, color: "var(--savo-shell-text)", letterSpacing: "-.025em", margin: "4px 0 0" }}>
            {isArabic ? "ترقّب. غموض. قيمة." : "Anticipation. Mystery. Value."}
          </h2>
        </div>
        <Link href="/mystery-boxes" style={{ color: "#00e5a0", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
          {isArabic ? "ابنِ صندوقك ←" : "Build Your Box →"}
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {tierList.map((tierKey) => {
          const tier = tiers[tierKey]!;
          const meta = TIER_META[tierKey];
          const isGold = meta.isGold;
          return (
            <Link
              key={tierKey}
              href="/mystery-boxes"
              style={{ backgroundColor: isGold ? "#0f0a00" : "#0f1420", border: `1px solid ${isGold ? "rgba(240,165,0,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20, padding: "36px 28px 32px", position: "relative", display: "flex", flexDirection: "column" }}
            >
              {meta.badge && (
                <div style={{ position: "absolute", top: 20, insetInlineEnd: 20, fontSize: 10, fontWeight: 700, color: isGold ? "#f0a500" : "#00e5a0", backgroundColor: isGold ? "rgba(240,165,0,0.12)" : "rgba(0,229,160,0.08)", border: `1px solid ${isGold ? "rgba(240,165,0,0.3)" : "rgba(0,229,160,0.22)"}`, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.1em" }}>
                  {isGold ? `+ ${meta.badge}` : meta.badge}
                </div>
              )}

              <BoxIllustration isGold={isGold} />

              <p style={{ fontSize: 11, fontWeight: 700, color: isGold ? "#f0a500" : "#00e5a0", letterSpacing: "0.12em", textAlign: "center", margin: "20px 0 8px" }}>
                {isArabic ? "6 منتجات بالداخل" : "6 PRODUCTS INSIDE"}
              </p>

              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#f0f2f7", textAlign: "center", margin: "0 0 20px", letterSpacing: "-0.01em" }}>
                {isArabic ? meta.labelAr : meta.label}
              </h3>

              <div style={{ marginBottom: 20 }}>
                <SlotRow total={6} mysteryCount={tier.mysteryCount} />
              </div>

              <div style={{ backgroundColor: isGold ? "rgba(240,165,0,0.06)" : "rgba(0,229,160,0.05)", border: `1px solid ${isGold ? "rgba(240,165,0,0.15)" : "rgba(0,229,160,0.12)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: isGold ? "#f0a500" : "#00e5a0", margin: "0 0 6px", letterSpacing: "0.04em" }}>
                  {tier.mysteryCount} {isArabic ? meta.mechanicLabelAr : meta.mechanicLabel}
                </p>
                <p style={{ fontSize: 14, color: "#8b95a8", margin: "0 0 6px", fontWeight: 600 }}>
                  {isArabic ? `+ تختار ${tier.pickCount}` : `+ YOU CHOOSE ${tier.pickCount}`}
                </p>
                <p style={{ fontSize: 13, color: "#6b778f", margin: 0 }}>
                  {isArabic ? `اختر ${tier.pickCount} من ${tier.poolSize} منتجات مختارة.` : `Choose ${tier.pickCount} from ${tier.poolSize} curated products.`}
                </p>
              </div>

              <div style={{ marginBottom: 20, marginTop: "auto" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 800, color: "#f0f2f7", textAlign: "center", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                  {tier.inStock ? formatKWD(tier.price) : isArabic ? "نفدت الكمية" : "Sold Out"}
                </p>
                {tier.valueMax && tier.inStock && (
                  <p style={{ fontSize: 13, color: isGold ? "#f0a500" : "#00e5a0", textAlign: "center", margin: 0 }}>
                    {isArabic ? `قيمة تصل إلى ${formatKWD(tier.valueMax)}` : `Value up to ${formatKWD(tier.valueMax)}`}
                  </p>
                )}
              </div>

              <span style={{ width: "100%", padding: "16px", borderRadius: 12, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em", backgroundColor: !tier.inStock ? "rgba(255,255,255,0.06)" : isGold ? "#f0a500" : "#00e5a0", color: !tier.inStock ? "#3d4a5f" : "#090b10", textAlign: "center", display: "block" }}>
                {!tier.inStock ? (isArabic ? "نفدت الكمية" : "Sold Out") : isGold ? (isArabic ? "انضم لـ SAVO Plus للفتح" : "Join SAVO Plus to Unlock") : isArabic ? "ابنِ صندوقي" : "Build My Box"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
