import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { getNewArrivals, getTrending, getLimitedDeals } from "@/lib/discovery-engine";
import { BundleService } from "@/lib/services/bundle-service";
import { serializeProducts } from "@/lib/utils";
import { ProductRail } from "@/components/product/product-grid";
import { Link } from "@/i18n/routing";
import { WORLD_THEMES } from "@/lib/world-themes";
import { Sparkles, Gift, TrendingUp, Crown, Zap, Layers, Package } from "lucide-react";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

function getMethodLinks(FEATURE_FLAGS: Awaited<ReturnType<typeof getLaunchFlags>>) {
  const links = [{ href: "/products?sort=newest", icon: Sparkles, labelEn: "New Arrivals", labelAr: "وصل حديثاً" }];
  if (FEATURE_FLAGS.MYSTERY_BOX_ENABLED) links.push({ href: "/mystery-boxes", icon: Gift, labelEn: "Mystery Boxes", labelAr: "صناديق المفاجآت" });
  if (FEATURE_FLAGS.GAMIFICATION_ENABLED) {
    links.push({ href: "/treasure-map", icon: Package, labelEn: "Treasure Hunt", labelAr: "رحلة الكنز" });
    links.push({ href: "/golden-ticket", icon: Crown, labelEn: "Golden Ticket", labelAr: "التذكرة الذهبية" });
  }
  links.push({ href: "/brands", icon: Sparkles, labelEn: "Browse by Brand", labelAr: "تصفح حسب الماركة" });
  links.push({ href: "/collections", icon: Layers, labelEn: "Curated Collections", labelAr: "تجميعات منتقاة" });
  links.push({ href: "/products?membersOnly=true", icon: Crown, labelEn: "SAVO Plus Exclusive", labelAr: "Savo Plus حصرياً" });
  links.push({ href: "/products?badge=EDITORS_PICK", icon: Sparkles, labelEn: "Editor's Picks", labelAr: "اختيار المحرر" });
  links.push({ href: "/products?badge=LIMITED", icon: Zap, labelEn: "Limited Edition", labelAr: "إصدار محدود" });
  links.push({ href: "/products?type=DEAL", icon: TrendingUp, labelEn: "Flash Sale", labelAr: "عروض فلاش" });
  return links;
}

/**
 * Ported from the latest V22 export (CustomerPages.tsx, DiscoverPage()).
 * V22's "Discovery Worlds" cards use fabricated stock photography per
 * world — production has no per-world image field, so each card uses
 * the SAME real gradient WorldHero already renders for that world
 * (WorldTheme.accentGradientFrom/To) plus the real heroEmoji/tagline,
 * instead of an invented photo. "Quick Ways In" is production's
 * existing real, flag-gated entry-point list (unchanged logic),
 * restyled as V22's pill row. Bundles/rails below are the same real
 * data as before — presentation only.
 */
export default async function DiscoverPage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  const locale = await getLocale();
  const isArabic = locale === "ar";

  const [newArrivals, trending, limitedDeals, bundles, worldCategories] = await Promise.all([
    getNewArrivals(8),
    getTrending(8),
    getLimitedDeals(8),
    BundleService.getActiveBundles(),
    prisma.category.findMany({ where: { slug: { in: Object.keys(WORLD_THEMES) } }, select: { name: true, nameAr: true, slug: true, icon: true } }),
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
            {worldCategories.map((c) => {
              const theme = WORLD_THEMES[c.slug];
              return (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className={`savo-discover-world bg-gradient-to-br ${theme.accentGradientFrom} ${theme.accentGradientTo}`}
                >
                  <span className="savo-discover-world-emoji">{theme.heroEmoji}</span>
                  <span className="savo-discover-world-name">{isArabic && c.nameAr ? c.nameAr : c.name}</span>
                  <span className="savo-discover-world-desc">{isArabic ? theme.heroTaglineAr : theme.heroTagline}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="savo-discover-quick">
        <div className="savo-products-eyebrow">{isArabic ? "طرق سريعة للدخول" : "Quick ways in"}</div>
        <div className="savo-discover-quick-row">
          {getMethodLinks(FEATURE_FLAGS).map((m) => (
            <Link key={m.href} href={m.href} className="savo-discover-quick-pill">
              <m.icon size={13} />
              {isArabic ? m.labelAr : m.labelEn}
            </Link>
          ))}
        </div>
      </div>

      {trending.length > 0 && <ProductRail title={isArabic ? "🔥 الأكثر رواجاً" : "🔥 Trending Now"} products={serializeProducts(trending) as any} />}
      {newArrivals.length > 0 && <ProductRail title={isArabic ? "🆕 وصل حديثاً" : "🆕 New Arrivals"} products={serializeProducts(newArrivals) as any} />}
      {limitedDeals.length > 0 && <ProductRail title={isArabic ? "⏳ عروض محدودة" : "⏳ Limited Deals"} products={serializeProducts(limitedDeals) as any} />}

      {bundles.length > 0 && (
        <div className="savo-category-shell savo-discover-bundles">
          <div className="savo-products-eyebrow">{isArabic ? "حزم موفّرة" : "Bundles"}</div>
          <div className="savo-discover-bundles-grid">
            {bundles.slice(0, 6).map((b: any) => (
              <div key={b.id} className="savo-discover-bundle-card">
                <p className="savo-discover-bundle-name">{b.name}</p>
                <p className="savo-discover-bundle-count">{b.items?.length ?? 0} {isArabic ? "منتجات" : "items"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
