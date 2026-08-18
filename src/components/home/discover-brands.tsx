import { Link } from "@/i18n/routing";
import type { HomepageViewModel } from "@/lib/homepage-view-model";

/**
 * Discover Brands — "Inside the Brand" (V22 source: src/App.tsx,
 * Brands()). Position: after SAVO Spotlight, matching V22's exact
 * source order (Spotlight → Brands → DiscoverTogether — the latter
 * not yet migrated, out of this task's scope).
 *
 * Real data only, canonical-first: `insideTheBrand` (built in
 * homepage-view-model.ts) is sourced from real Brand records first —
 * never reconstructed from Product.brandName when a linked Brand row
 * exists — ranked by REAL linked product count (Product.brandId, not
 * a name-matched guess). Legacy brandName-only groups (no linked
 * Brand row yet) only fill remaining slots below 6, exactly the
 * "historical fallback only where no linked Brand exists" rule.
 *
 * Visual priority per card (V22 spec): coverImageUrl → logoUrl
 * (contained, clean surface, never cropped) → monogram (same
 * canonical fallback as the real /brands page). If a brand's media
 * fields are genuinely null, the monogram IS the correct render —
 * not a bug — real imagery must be uploaded via /admin/catalog-brands.
 *
 * Routing: every card links via the REAL, canonical Brand.slug when
 * the brand is linked (isLinked:true) — zero slug recomputation. Only
 * unlinked legacy groups fall back to a locally generated slug (there
 * is no Brand.slug to use for those).
 */
const ACCENTS = ["teal", "gold", "fire"] as const;

export function DiscoverBrands({ insideTheBrand, locale }: { insideTheBrand: HomepageViewModel["insideTheBrand"]; locale: string }) {
  const isArabic = locale === "ar";
  if (insideTheBrand.length === 0) return null;

  return (
    <section className="savo-discoverbrands">
      <div className="savo-discoverbrands-head">
        <p className="savo-products-eyebrow">{isArabic ? "اكتشف العلامات" : "Discover Brands"}</p>
        <h2 className="savo-discoverbrands-title">{isArabic ? "داخل العلامة التجارية" : "Inside the Brand"}</h2>
        <Link href="/brands" className="savo-discoverbrands-viewall">{isArabic ? "كل العلامات ←" : "All brands →"}</Link>
      </div>

      <div className="savo-discoverbrands-row">
        {insideTheBrand.map((b, i) => {
          const accent = ACCENTS[i % ACCENTS.length];
          const displayName = isArabic && b.nameAr ? b.nameAr : b.name;
          return (
            <Link key={b.id ?? b.slug} href={`/brands/${b.slug}`} className={`savo-discoverbrands-card savo-discoverbrands-card--${accent}${i === 0 ? " is-featured" : ""}`}>
              {b.coverImageUrl ? (
                <img src={b.coverImageUrl} alt={displayName} className="savo-discoverbrands-cover" />
              ) : b.logoUrl ? (
                <span className="savo-discoverbrands-logo-fallback"><img src={b.logoUrl} alt={displayName} /></span>
              ) : (
                <span className="savo-discoverbrands-monogram">{b.name[0]?.toUpperCase()}</span>
              )}
              <span className="savo-discoverbrands-scrim" />
              <span className="savo-discoverbrands-name">{displayName}</span>
              <span className="savo-discoverbrands-explore">{isArabic ? "استكشف ←" : "Explore →"}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
