import { Link } from "@/i18n/routing";
import Image from "next/image";
import { formatKWD } from "@/lib/utils";
import { Award } from "lucide-react";

interface Box {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  saveoPrice: number | string;
  mysteryBoxValueMin?: number | string | null;
  mysteryBoxValueMax?: number | string | null;
  images: { url: string }[];
}

/**
 * Ported from the latest V22 export (CustomerPages.tsx,
 * MysteryTierCard()). Real per-tier data only: box name/image/price
 * come from getMysteryBoxesByTier() (the actual production Mystery
 * Box engine) — V22's fabricated tier description ("Elevated
 * discovery. Premium brands...") is not migrated; the real
 * guaranteed-value line (mysteryBoxValueMin) takes its place, same
 * as before this migration. Silver is the visually "featured" middle
 * tier — a presentational choice (which real tier gets the accent
 * ribbon), not a data change.
 */
const TIER_ACCENT: Record<string, string> = {
  bronze: "#C47B3B",
  silver: "var(--savo-shell-muted)",
  gold: "var(--savo-shell-gold)",
};

export function MysteryBoxTiers({
  tiers,
  locale,
  labels,
}: {
  tiers: { bronze: Box[]; silver: Box[]; gold: Box[] };
  locale: string;
  labels: { bronze: string; silver: string; gold: string; guaranteedValue: string };
}) {
  const entries: [keyof typeof tiers, string][] = [
    ["bronze", labels.bronze],
    ["silver", labels.silver],
    ["gold", labels.gold],
  ];

  return (
    <div className="savo-mystery-tiers">
      {entries.map(([tier, label]) => {
        const box = tiers[tier][0];
        if (!box) return null;
        const name = locale === "ar" && box.nameAr ? box.nameAr : box.name;
        const featured = tier === "silver";

        return (
          <Link
            key={box.id}
            href={`/products/${box.slug}`}
            className={`savo-mystery-tier${featured ? " is-featured" : ""}`}
            style={{ "--tier-accent": TIER_ACCENT[tier] } as React.CSSProperties}
          >
            {featured && <div className="savo-mystery-tier-ribbon">{locale === "ar" ? "الأكثر شعبية" : "Most popular"}</div>}
            <div className="savo-mystery-tier-media">
              {box.images[0] && <Image src={box.images[0].url} alt={name} fill className="object-cover" />}
              <div className="savo-mystery-tier-glow" />
              <div className="savo-mystery-tier-icon">⬡</div>
            </div>
            <div className="savo-mystery-tier-body">
              <div className="savo-mystery-tier-head">
                <span className="savo-mystery-tier-label">{label}</span>
                <span className="savo-mystery-tier-price">{formatKWD(Number(box.saveoPrice))}</span>
              </div>
              <p className="savo-mystery-tier-name">{name}</p>
              {box.mysteryBoxValueMin && (
                <p className="savo-mystery-tier-value">
                  <Award size={13} /> {labels.guaranteedValue}: {formatKWD(Number(box.mysteryBoxValueMin))}+
                </p>
              )}
              <span className="savo-mystery-tier-cta">{locale === "ar" ? `اكتشف ${label}` : `Discover ${label}`}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
