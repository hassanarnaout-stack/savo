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
  return links;
}

export default async function DiscoverPage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  const locale = await getLocale();

  const [newArrivals, trending, limitedDeals, bundles, worldCategories] = await Promise.all([
    getNewArrivals(8),
    getTrending(8),
    getLimitedDeals(8),
    BundleService.getActiveBundles(),
    prisma.category.findMany({ where: { slug: { in: Object.keys(WORLD_THEMES) } }, select: { name: true, nameAr: true, slug: true, icon: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-saveo-emerald-700">{locale === "ar" ? "🔍 اكتشف" : "🔍 Discover"}</h1>
        <p className="mt-2 text-sm text-saveo-emerald-700/50">{locale === "ar" ? "طرق لا نهائية لتكتشف Savo" : "Endless ways to discover Savo"}</p>
      </div>

      {worldCategories.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-saveo-emerald-700">{locale === "ar" ? "🌍 العوالم" : "🌍 Worlds"}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {worldCategories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`} className="card-float shadow-luxury flex flex-col items-center gap-1.5 rounded-xl2 bg-white p-4 text-center">
                <span className="text-3xl">{c.icon}</span>
                <span className="text-xs font-semibold text-saveo-emerald-700">{locale === "ar" && c.nameAr ? c.nameAr : c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-saveo-emerald-700">{locale === "ar" ? "✨ طرق سريعة" : "✨ Quick Ways In"}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {getMethodLinks(FEATURE_FLAGS).map((m) => (
            <Link key={m.href} href={m.href} className="card-float shadow-luxury flex items-center gap-2.5 rounded-xl2 bg-white p-4">
              <m.icon className="h-5 w-5 text-saveo-gold-500" />
              <span className="text-sm font-semibold text-saveo-emerald-700">{locale === "ar" ? m.labelAr : m.labelEn}</span>
            </Link>
          ))}
          <Link href="/brands" className="card-float shadow-luxury flex items-center gap-2.5 rounded-xl2 bg-white p-4">
            <Sparkles className="h-5 w-5 text-saveo-gold-500" />
            <span className="text-sm font-semibold text-saveo-emerald-700">{locale === "ar" ? "تصفح حسب الماركة" : "Browse by Brand"}</span>
          </Link>
          <Link href="/collections" className="card-float shadow-luxury flex items-center gap-2.5 rounded-xl2 bg-white p-4">
            <Layers className="h-5 w-5 text-saveo-gold-500" />
            <span className="text-sm font-semibold text-saveo-emerald-700">{locale === "ar" ? "تجميعات منتقاة" : "Curated Collections"}</span>
          </Link>
          <Link href="/products?membersOnly=true" className="card-float shadow-luxury flex items-center gap-2.5 rounded-xl2 bg-white p-4">
            <Crown className="h-5 w-5 text-saveo-gold-500" />
            <span className="text-sm font-semibold text-saveo-emerald-700">{locale === "ar" ? "Savo Plus حصرياً" : "Savo Plus Exclusive"}</span>
          </Link>
          <Link href="/products?badge=EDITORS_PICK" className="card-float shadow-luxury flex items-center gap-2.5 rounded-xl2 bg-white p-4">
            <Sparkles className="h-5 w-5 text-saveo-gold-500" />
            <span className="text-sm font-semibold text-saveo-emerald-700">{locale === "ar" ? "اختيار المحرر" : "Editor's Picks"}</span>
          </Link>
          <Link href="/products?badge=LIMITED" className="card-float shadow-luxury flex items-center gap-2.5 rounded-xl2 bg-white p-4">
            <Zap className="h-5 w-5 text-saveo-gold-500" />
            <span className="text-sm font-semibold text-saveo-emerald-700">{locale === "ar" ? "إصدار محدود" : "Limited Edition"}</span>
          </Link>
          <Link href="/products?type=DEAL" className="card-float shadow-luxury flex items-center gap-2.5 rounded-xl2 bg-white p-4">
            <TrendingUp className="h-5 w-5 text-saveo-gold-500" />
            <span className="text-sm font-semibold text-saveo-emerald-700">{locale === "ar" ? "عروض فلاش" : "Flash Sale"}</span>
          </Link>
        </div>
      </section>

      {trending.length > 0 && <ProductRail title={locale === "ar" ? "🔥 الأكثر رواجاً" : "🔥 Trending Now"} products={serializeProducts(trending) as any} />}
      {newArrivals.length > 0 && <ProductRail title={locale === "ar" ? "🆕 وصل حديثاً" : "🆕 New Arrivals"} products={serializeProducts(newArrivals) as any} />}
      {limitedDeals.length > 0 && <ProductRail title={locale === "ar" ? "⏳ عروض محدودة" : "⏳ Limited Deals"} products={serializeProducts(limitedDeals) as any} />}

      {bundles.length > 0 && (
        <section className="py-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-saveo-emerald-700">
            <Layers className="h-5 w-5" /> {locale === "ar" ? "حزم موفّرة" : "Bundles"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bundles.slice(0, 6).map((b: any) => (
              <div key={b.id} className="card-float shadow-luxury rounded-xl2 bg-white p-4">
                <p className="text-sm font-bold text-saveo-emerald-700">{b.name}</p>
                <p className="mt-1 text-xs text-saveo-emerald-700/50">{b.items?.length ?? 0} {locale === "ar" ? "منتجات" : "items"}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
