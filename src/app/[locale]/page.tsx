import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { ProductGrid, ProductRail } from "@/components/product/product-grid";
import { DealOfTheHourCard } from "@/components/product/deal-of-the-hour-card";
import { FrequentlyBoughtTogether } from "@/components/product/frequently-bought-together";
import { MysteryBoxTiers } from "@/components/home/mystery-box-tiers";
import { RecentlyViewed } from "@/components/home/recently-viewed";
import { SaveoPlusSection } from "@/components/home/saveo-plus-section";
import { getLaunchFlags } from "@/lib/launch-flags";
import { TodaysDiscoveryWidget } from "@/components/campaigns/todays-discovery-widget";
import { SponsoredProductsRail } from "@/components/product/sponsored-products-rail";
import { FlashDealsRail } from "@/components/product/flash-deals-rail";
import { BrandTakeoverBanner } from "@/components/product/brand-takeover-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import {
  getTrending, getMysteryBoxesByTier, getFeaturedSuppliers,
  getDealOfTheHour, getRecommendedForUser,
} from "@/lib/discovery-engine";
import { getFrequentlyBoughtTogether } from "@/lib/recommendations";
import { ArrowRight, Gift, Zap, ShieldCheck, Truck } from "lucide-react";
import { serializeProducts, serializeProduct } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const FEATURE_FLAGS = await getLaunchFlags();
  const [
    categories, dealOfHour, deals, rescueDeals, trending,
    mysteryBoxTiers, featuredSuppliers, recommended, reviews,
    mysteryBoxesEnabled, saveoPlusEnabled,
  ] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, isFeatured: true, parentId: null },
      orderBy: { sortOrder: "asc" },
    }),
    getDealOfTheHour(),
    prisma.product.findMany({
      where: { type: "DEAL", status: "ACTIVE" },
      take: 8,
      orderBy: { dealEndsAt: "asc" },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.product.findMany({
      where: { type: "RESCUE", status: "ACTIVE" },
      take: 8,
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    }),
    getTrending(8),
    getMysteryBoxesByTier(),
    getFeaturedSuppliers(6),
    getRecommendedForUser({ take: 8 }),
    prisma.review.findMany({
      where: { rating: { gte: 4 }, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } }, product: { select: { name: true } } },
    }),
    FEATURE_FLAGS.MYSTERY_BOX_ENABLED,
    FEATURE_FLAGS.SAVEO_PLUS_ENABLED,
  ]);

  // Anchor "Frequently Bought Together" on the top trending product, if any.
  const fbt = trending[0] ? await getFrequentlyBoughtTogether(trending[0].id) : [];

  return {
    categories, dealOfHour, deals, rescueDeals, trending,
    mysteryBoxTiers, featuredSuppliers, recommended, reviews, fbt,
    mysteryBoxesEnabled, saveoPlusEnabled, FEATURE_FLAGS,
  };
}

export default async function HomePage() {
  const [
    { categories, dealOfHour, deals, rescueDeals, trending, mysteryBoxTiers, featuredSuppliers, recommended, reviews, fbt, mysteryBoxesEnabled, saveoPlusEnabled, FEATURE_FLAGS },
    home, locale,
  ] = await Promise.all([getHomeData(), getTranslations("home"), getLocale()]);

  const serializedDealOfHour = dealOfHour
    ? {
        ...dealOfHour,
        product: {
          ...serializeProduct(dealOfHour.product as any),
          supplier: {
            ...dealOfHour.product.supplier,
            commissionRate: Number(dealOfHour.product.supplier.commissionRate),
          },
        },
      }
    : null;

  return (
    <div>
      {/* 1. Hero */}
      <section className="saveo-aura relative overflow-hidden bg-saveo-emerald-700">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-24">
          <div className="relative z-10">
            <span className="savings-tag mb-5">{home("heroEyebrow")}</span>
            <h1 className="text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              {home("heroTitle1")}
              <br />
              <span className="text-saveo-gold-400">{home("heroTitle2")}</span>
            </h1>
            <p className="mt-5 max-w-md text-white/60">{home("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/category/saveo-deals" className="btn-primary">
                {home("startDiscovering")} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
              <Link href="/account" className="btn-outline !border-white/20 !text-white hover:!border-white/50">
                <Gift className="h-4 w-4" /> {home("joinSaveoPlus")}
              </Link>
            </div>
          </div>
          <div className="relative z-10 hidden md:block">
            <div className="ms-auto grid w-fit grid-cols-2 gap-4">
              <div className="col-span-2 flex items-center gap-3 rounded-xl2 bg-white p-5">
                <Zap className="h-8 w-8 text-saveo-gold-500" />
                <div>
                  <p className="text-sm font-bold text-saveo-emerald-700">{home("upTo70")}</p>
                  <p className="text-xs text-saveo-emerald-700/50">{home("onSelectedDeals")}</p>
                </div>
              </div>
              <div className="rounded-xl2 bg-saveo-gold-400 p-5 text-saveo-emerald-700">
                <Truck className="h-6 w-6" />
                <p className="mt-2 text-xs font-semibold">{home("fastDelivery")}</p>
              </div>
              <div className="rounded-xl2 bg-white p-5">
                <ShieldCheck className="h-6 w-6 text-saveo-emerald-700" />
                <p className="mt-2 text-xs font-semibold text-saveo-emerald-700">{home("verifiedQuality")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {FEATURE_FLAGS.GAMIFICATION_ENABLED && <TodaysDiscoveryWidget locale={locale} />}

      <BrandTakeoverBanner />

      <SponsoredProductsRail placementType="HOMEPAGE_TOP" locale={locale} />

      <FlashDealsRail locale={locale} />

      {/* 2. Deal of the Hour */}
      {FEATURE_FLAGS.ADVANCED_DEAL_OF_HOUR_ENABLED && serializedDealOfHour && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-saveo-emerald-700">⏰ {home("dealOfTheHour")}</h2>
            <p className="text-sm text-saveo-emerald-700/50">{home("dealOfTheHourSubtitle")}</p>
          </div>
          <DealOfTheHourCard deal={serializedDealOfHour as any} />
        </section>
      )}

      {/* 3. Mystery Boxes — Bronze / Silver / Gold */}
      {mysteryBoxesEnabled && (mysteryBoxTiers.bronze.length > 0 || mysteryBoxTiers.silver.length > 0 || mysteryBoxTiers.gold.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-saveo-emerald-700">🎁 {home("mysteryBoxesTitle")}</h2>
            <p className="text-sm text-saveo-emerald-700/50">{home("mysteryBoxesSubtitle")}</p>
          </div>
          <MysteryBoxTiers
            tiers={mysteryBoxTiers as any}
            locale={locale}
            labels={{
              bronze: home("tierBronze"),
              silver: home("tierSilver"),
              gold: home("tierGold"),
              guaranteedValue: home("guaranteedValue"),
            }}
          />
        </section>
      )}

      {/* 6. Categories — big cards */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="card flex flex-col items-center gap-3 p-8 text-center transition-transform hover:-translate-y-1"
            >
              <span className="text-4xl">{cat.icon ?? "🛍️"}</span>
              <span className="text-sm font-bold text-saveo-emerald-700">
                {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProductRail
          title="⚡ Savo Deals"
          subtitle="Grab these before the countdown ends"
          products={serializeProducts(deals) as any}
        />

        {/* 4. Trending Deals */}
        {trending.length > 0 && (
          <ProductRail
            title={`🔥 ${home("trending")}`}
            subtitle={home("trendingSubtitle")}
            products={serializeProducts(trending) as any}
          />
        )}

        <ProductRail
          title={`🛟 ${home("rescueDeals")}`}
          subtitle={home("rescueSubtitle")}
          products={serializeProducts(rescueDeals) as any}
        />

        {/* 7. Recommended For You */}
        {FEATURE_FLAGS.ADVANCED_RECOMMENDATIONS_ENABLED && recommended.length > 0 && (
          <ProductRail
            title={`✨ ${home("recommendedForYou")}`}
            subtitle={home("recommendedSubtitle")}
            products={serializeProducts(recommended) as any}
            source="recommended_for_you"
          />
        )}

        {/* 8. Frequently Bought Together (Smart Cross Selling) */}
        {FEATURE_FLAGS.SMART_CROSS_SELLING_ENABLED && fbt.length > 1 && (
          <section className="py-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-saveo-emerald-700">🛒 {home("frequentlyBoughtTitle")}</h2>
              <p className="text-sm text-saveo-emerald-700/50">{home("frequentlyBoughtSubtitle")}</p>
            </div>
            <FrequentlyBoughtTogether items={serializeProducts(fbt) as any} />
          </section>
        )}

        {/* 9. Recently Viewed (client-side, hides itself if empty) */}
        <RecentlyViewed title={`👀 ${home("recentlyViewed")}`} subtitle={home("recentlyViewedSubtitle")} />

        {/* 10. Saveo Plus */}
        {saveoPlusEnabled && (
        <section className="py-6">
          <SaveoPlusSection
            title={home("saveoPlusTitle")}
            subtitle={home("saveoPlusSubtitle")}
            benefits={[
              home("saveoPlusBenefit1"),
              home("saveoPlusBenefit2"),
              home("saveoPlusBenefit3"),
              home("saveoPlusBenefit4"),
            ]}
            joinLabel={home("joinNow")}
          />
        </section>
        )}

        {/* 11. Reviews */}
        <section className="py-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-saveo-emerald-700">💬 {home("reviewsTitle")}</h2>
            <p className="text-sm text-saveo-emerald-700/50">{home("reviewsSubtitle")}</p>
          </div>
          <ReviewsSection reviews={reviews as any} locale={locale} emptyMessage={home("noReviewsYet")} />
        </section>
      </div>
    </div>
  );
}
