import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { ProductGrid, ProductRail } from "@/components/product/product-grid";
import { DealOfTheHourCard } from "@/components/product/deal-of-the-hour-card";
import { FrequentlyBoughtTogether } from "@/components/product/frequently-bought-together";
import { MysteryBoxTiers } from "@/components/home/mystery-box-tiers";
import { FeaturedSuppliers } from "@/components/home/featured-suppliers";
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
import { CountdownTimer } from "@/components/product/countdown-timer";
import { ArrowRight, Gift } from "lucide-react";
import { serializeProducts, serializeProduct, formatKWD, calcDiscountPct } from "@/lib/utils";

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
  include: {
    _count: {
      select: {
        products: true,
      },
    },
  },
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

  // Presentational-only: first 3 real deals for the hero's floating preview
  // cards (Figma's HeroSection shows floating product cards on desktop).
  // Uses the SAME `deals` data already fetched above for the ProductRail —
  // no mock content, no extra query.
  const heroPreviewDeals = serializeProducts(deals).slice(0, 3) as any[];

  return (
    <div>
      {/* 1. Hero — ink surface with Figma's exact dual radial-glow treatment */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 20% 60%, rgba(0,201,167,0.13) 0%, transparent 52%), radial-gradient(ellipse at 80% 20%, rgba(255,77,46,0.09) 0%, transparent 46%), #0D0E12",
        }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-24">
          <div className="relative z-10 font-manrope">
            {serializedDealOfHour?.product?.dealEndsAt && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-saveo-ink-mid px-4 py-[7px]">
                <span className="h-[7px] w-[7px] animate-figma-dot rounded-full bg-saveo-accent" />
                <span className="text-xs font-semibold text-saveo-muted">{home("dealOfTheHour")}</span>
                <CountdownTimer dealEndsAt={serializedDealOfHour.product.dealEndsAt} compact />
              </div>
            )}
            <span className="savings-tag mb-5">{home("heroEyebrow")}</span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[64px] lg:leading-[0.95] lg:tracking-[-0.03em]">
              {home("heroTitle1")}
              <br />
              <span className="text-saveo-primary">{home("heroTitle2")}</span>
            </h1>
            <p className="mt-5 max-w-md text-saveo-muted">{home("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/category/saveo-deals"
                className="inline-flex items-center gap-2 rounded-xl bg-saveo-accent px-7 py-[15px] text-[15px] font-bold text-white transition-colors hover:bg-saveo-accent-soft"
              >
                {home("startDiscovering")} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-7 py-[15px] text-[15px] font-semibold text-white transition-colors hover:border-white/30"
              >
                <Gift className="h-4 w-4" /> {home("joinSaveoPlus")}
              </Link>
            </div>
          </div>

          {/* Floating deal previews — real products from `deals`, Figma's
              bobbing-card treatment (pure CSS `animate-float`, no framer-motion). */}
          {heroPreviewDeals.length > 0 && (
            <div className="relative z-10 hidden flex-col gap-3.5 md:flex">
              {heroPreviewDeals.map((prod, i) => {
                const discountPct = calcDiscountPct(Number(prod.originalPrice), Number(prod.saveoPrice));
                return (
                  <Link
                    key={prod.id}
                    href={`/products/${prod.slug}`}
                    className={`flex max-w-[310px] items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-saveo-ink-mid p-3.5 motion-safe:animate-float ${
                      i === 1 ? "self-end" : "self-start"
                    }`}
                    style={{ animationDelay: `${i * 0.9}s` }}
                  >
                    {prod.images?.[0] && (
                      <Image
                        src={prod.images[0].url}
                        alt={prod.name}
                        width={58}
                        height={58}
                        className="h-[58px] w-[58px] shrink-0 rounded-[10px] object-cover"
                      />
                    )}
                    <div>
                      <div className="line-clamp-1 text-[13px] font-semibold leading-[1.35] text-white">{prod.name}</div>
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="font-manrope text-[15px] font-extrabold text-saveo-primary">{formatKWD(Number(prod.saveoPrice))}</span>
                        <span className="text-xs text-saveo-muted line-through">{formatKWD(Number(prod.originalPrice))}</span>
                        {discountPct > 0 && (
                          <span className="rounded-[5px] bg-saveo-ink-low px-1.5 py-px text-[11px] font-bold text-saveo-accent">-{discountPct}%</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {FEATURE_FLAGS.GAMIFICATION_ENABLED && <TodaysDiscoveryWidget locale={locale} />}

      <BrandTakeoverBanner />

      <SponsoredProductsRail placementType="HOMEPAGE_TOP" locale={locale} />

      <FlashDealsRail locale={locale} />

      {/* 2. Deal of the Hour */}
      {FEATURE_FLAGS.ADVANCED_DEAL_OF_HOUR_ENABLED && serializedDealOfHour && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-saveo-ink sm:text-[28px]">
              ⏰ {home("dealOfTheHour")}
            </h2>
            <p className="mt-1 text-sm text-saveo-muted">{home("dealOfTheHourSubtitle")}</p>
          </div>
          <DealOfTheHourCard deal={serializedDealOfHour as any} />
        </section>
      )}

      {/* 3. Mystery Boxes — Bronze / Silver / Gold
          Dark "ink" dramatic surface, ported from Figma Make's Mystery Box
          treatment (near-black + soft radial glows + a bobbing box icon). */}
      {mysteryBoxesEnabled && (mysteryBoxTiers.bronze.length > 0 || mysteryBoxTiers.silver.length > 0 || mysteryBoxTiers.gold.length > 0) && (
        <section className="figma-ink-panel py-14">
          <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-saveo-primary">{home("mysteryBoxesTitle")}</p>
                <h2 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight text-white">
                  <span className="text-4xl motion-safe:animate-float" aria-hidden="true">🎁</span>
                  {home("mysteryBoxesSubtitle")}
                </h2>
              </div>
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
          </div>
        </section>
      )}

      {/* 6. Categories — Figma's compact tile grid on a `surface` section */}
      <section className="bg-saveo-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-saveo-muted">{home("categoriesEyebrow")}</p>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-saveo-ink sm:text-[28px]">{home("categoriesTitle")}</h2>
            </div>
            <Link href="/products" className="flex items-center gap-1 text-[13px] font-semibold text-saveo-primary">
              {home("allCategories")} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 md:grid-cols-8">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-saveo-border bg-saveo-card px-2.5 py-4 text-center font-manrope transition-all duration-200 hover:-translate-y-1 hover:shadow-figma-card sm:py-5"
              >
                <span className="text-2xl sm:text-[28px]">{cat.icon ?? "🛍️"}</span>
                <span className="line-clamp-1 text-[11px] font-semibold text-saveo-ink">
                  {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
                </span>
                <span className="text-[9px] font-bold text-saveo-primary">{cat._count?.products ?? ""}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6.5 Brands / Suppliers — Figma's ShopByBrandSection equivalent.
          `featuredSuppliers` was already being fetched above but never
          rendered anywhere in the app; wiring it into the existing
          FeaturedSuppliers component here (no new query, no new logic). */}
      {featuredSuppliers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-saveo-muted">{home("featuredSuppliers")}</p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-saveo-ink sm:text-[28px]">{home("featuredSuppliersSubtitle")}</h2>
          </div>
          <FeaturedSuppliers
            suppliers={featuredSuppliers as any}
            locale={locale}
            productsLabel={(count) => home("productsCount", { count })}
          />
        </section>
      )}

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
            <div className="mb-5">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-saveo-ink">🛒 {home("frequentlyBoughtTitle")}</h2>
              <p className="mt-1 text-sm text-saveo-muted">{home("frequentlyBoughtSubtitle")}</p>
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
          <div className="mb-5">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-saveo-ink">💬 {home("reviewsTitle")}</h2>
            <p className="mt-1 text-sm text-saveo-muted">{home("reviewsSubtitle")}</p>
          </div>
          <ReviewsSection reviews={reviews as any} locale={locale} emptyMessage={home("noReviewsYet")} />
        </section>
      </div>
    </div>
  );
}
