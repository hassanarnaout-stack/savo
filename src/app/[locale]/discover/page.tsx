import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { getNewArrivals, getTrending } from "@/lib/discovery-engine";
import { serializeProducts } from "@/lib/utils";
import { DiscoverRailCard } from "@/components/product/discover-rail-card";
import { Link } from "@/i18n/routing";
import { WORLD_THEMES } from "@/lib/world-themes";
import { getLaunchFlags } from "@/lib/launch-flags";
import Image from "next/image";
import { getQuickWayDestination } from "@/lib/quick-way-destinations";
import * as Icons from "lucide-react";

/**
 * Site-wide performance pass: this page reads zero session/user-specific
 * data (verified — no auth()/cookies()/headers() anywhere below), so
 * force-dynamic was forcing a fresh render on every single request for
 * no real reason. Same ISR pattern already used on /products and
 * /category/[slug].
 */
export const revalidate = 30;

/** Quick Ways In — admin-managed (see /admin/discover-quick-ways).
 * Icon names are free text in the DB but only rendered if they match a
 * real Lucide export ("approved predefined set" — bounded by what
 * actually exists in the icon library, not arbitrary strings). */
async function getQuickWayItems(FEATURE_FLAGS: Awaited<ReturnType<typeof getLaunchFlags>>) {
  const shortcuts = await prisma.quickWayShortcut.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return shortcuts
    .map((s) => {
      const destination = getQuickWayDestination(s.destinationKey);
      if (!destination) return null; // stale/unknown key — skip rather than link to nothing
      if (destination.requiresFlag && !FEATURE_FLAGS[destination.requiresFlag]) return null;
      const Icon = (Icons as any)[s.icon] ?? Icons.Sparkles;
      return { href: destination.href, Icon, labelEn: s.labelEn, labelAr: s.labelAr, id: s.id };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 8);
}

/**
 * Ported from the latest V22 export (CustomerPages.tsx, DiscoverPage()).
 * Corrective pass: V22's real world card is a real background PHOTO
 * (opacity ~0.35) + dark gradient overlay + a small accent dot + name
 * + one-line tagline — not a flat Tailwind gradient with a large emoji
 * icon (what this page rendered before, which had no imagery at all
 * and read as too text-heavy versus the Figma source). Now uses each
 * world category's real image (imageUrl, or its first real product's
 * image as fallback — same pattern as the homepage Categories mosaic),
 * with the real heroTagline. No fabricated photography.
 */
const WORLD_ACCENTS = ["var(--savo-shell-discovery)", "var(--savo-shell-gold)", "var(--savo-shell-fire)"];
export default async function DiscoverPage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  const locale = await getLocale();
  const isArabic = locale === "ar";

  const [newArrivals, trending, worldCategories, quickWayItems] = await Promise.all([
    getNewArrivals(6),
    getTrending(6),
    prisma.category.findMany({ where: { slug: { in: Object.keys(WORLD_THEMES) } }, select: { name: true, nameAr: true, slug: true, imageUrl: true, products: { take: 1, where: { images: { some: {} } }, select: { images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } } }),
    getQuickWayItems(FEATURE_FLAGS),
  ]);

  return (
    <div className="savo-discover-page">
      <div className="savo-products-intro">
        <div className="savo-products-eyebrow">{isArabic ? "اكتشف سافو" : "Discover SAVO"}</div>
        <div className="savo-products-heading-row">
          <h1>{isArabic ? "ما الجديد اليوم؟" : "Find something unexpected."}</h1>
        </div>
        <p className="savo-brands-sub">{isArabic ? "استكشف المنتجات والعلامات والعروض وتجارب سافو." : "Explore products, brands, deals, collections and SAVO experiences."}</p>
      </div>

      {worldCategories.length > 0 && (
        <div className="savo-discover-worlds">
          <div className="savo-products-eyebrow">{isArabic ? "عوالم الاكتشاف" : "Discovery Worlds"}</div>
          <h2 className="savo-discover-worlds-title">{isArabic ? "أين تريد الذهاب اليوم؟" : "Where do you want to go today?"}</h2>
          <div className="savo-discover-worlds-grid">
            {worldCategories.map((c, i) => {
              const theme = WORLD_THEMES[c.slug];
              const image = c.imageUrl ?? c.products[0]?.images[0]?.url ?? null;
              const accent = WORLD_ACCENTS[i % WORLD_ACCENTS.length];
              return (
                <Link key={c.slug} href={`/category/${c.slug}`} className="savo-discover-world" style={{ "--world-accent": accent } as React.CSSProperties}>
                  {image && <Image src={image} alt="" fill sizes="(max-width: 900px) 50vw, 33vw" className="savo-discover-world-img" />}
                  <span className="savo-discover-world-scrim" />
                  <span className="savo-discover-world-copy">
                    <span className="savo-discover-world-dot" />
                    <span className="savo-discover-world-name">{isArabic && c.nameAr ? c.nameAr : c.name}</span>
                    <span className="savo-discover-world-desc">{isArabic ? theme.heroTaglineAr : theme.heroTagline}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {quickWayItems.length > 0 && (
        <div className="savo-discover-quick">
          <div className="savo-products-eyebrow">{isArabic ? "طرق سريعة للدخول" : "Quick ways in"}</div>
          <div className="savo-discover-quick-row">
            {quickWayItems.map((m) => (
              <Link key={m.id} href={m.href} className="savo-discover-quick-pill">
                <m.Icon size={13} />
                {isArabic ? m.labelAr : m.labelEn}
              </Link>
            ))}
          </div>
        </div>
      )}

      {trending.length > 0 && (
        <div className="savo-discover-rail">
          <div className="savo-discover-rail-head">
            <div className="savo-products-eyebrow">{isArabic ? "الأكثر شعبية" : "Right now"}</div>
            <h2 className="savo-pdp-rail-title">{isArabic ? "الأكثر رواجاً" : "Trending"}</h2>
          </div>
          <div className="savo-discover-rail-row">
            {serializeProducts(trending).map((product: any) => <DiscoverRailCard key={product.id} product={product} />)}
            <div className="savo-discover-rail-spacer" aria-hidden="true" />
          </div>
        </div>
      )}
      {newArrivals.length > 0 && (
        <div className="savo-discover-rail savo-pdp-section--surface">
          <div className="savo-discover-rail-head">
            <div className="savo-products-eyebrow">{isArabic ? "وصل حديثاً" : "Just arrived"}</div>
            <h2 className="savo-pdp-rail-title">{isArabic ? "إضافات جديدة" : "New Arrivals"}</h2>
          </div>
          <div className="savo-discover-rail-row">
            {serializeProducts(newArrivals).map((product: any) => <DiscoverRailCard key={product.id} product={product} />)}
            <div className="savo-discover-rail-spacer" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
