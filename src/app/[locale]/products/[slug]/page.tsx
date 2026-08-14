import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PriceTag } from "@/components/product/price-tag";
import { CountdownTimer } from "@/components/product/countdown-timer";
import { ProductRail } from "@/components/product/product-grid";
import { AddToCartPanel } from "@/components/product/add-to-cart-panel";
import { FrequentlyBoughtTogether } from "@/components/product/frequently-bought-together";
import {
  getCrossSell,
  getUpsell,
  getRelatedProducts,
  getFrequentlyBoughtTogether,
} from "@/lib/recommendations";
import { BundleService } from "@/lib/services/bundle-service";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { FlashDealBanner } from "@/components/product/flash-deal-banner";
import { BrandCampaignService } from "@/lib/services/brand-campaign-service";
import { SponsoredSlotService } from "@/lib/services/sponsored-slot-service";
import { PremiumProductGallery } from "@/components/product/premium-product-gallery";
import { LiveProductSignals } from "@/components/product/live-product-signals";
import { SubscribeAndSaveWidget } from "@/components/product/subscribe-and-save-widget";
import { ProductStorySection } from "@/components/product/product-story-section";
import { ProductScene } from "@/components/product/product-scene";
import { ProductRevealWrapper } from "@/components/product/product-reveal-wrapper";
import { Product360Viewer } from "@/components/product/product-360-viewer";
import { VideoCommercePlayer } from "@/components/product/video-commerce-player";
import { IngredientExplorer } from "@/components/product/ingredient-explorer";
import { NutritionExperience } from "@/components/product/nutrition-experience";
import { ProductBadges } from "@/components/product/product-badges";
import { StoryModeTimeline } from "@/components/product/story-mode-timeline";
import { ReviewsSection } from "@/components/product/reviews-section";
import { ARModelViewer } from "@/components/product/ar-model-viewer";
import { FlavorJourney } from "@/components/product/flavor-journey";
import { SmartComparison } from "@/components/product/smart-comparison";
import { SmartComparisonService } from "@/lib/services/smart-comparison-service";
import { BundleOffer } from "@/components/product/bundle-offer";
import { MembershipService } from "@/lib/services/membership-service";
import { CalendarClock, PackageCheck, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { ViewTracker } from "@/components/product/view-tracker";
import { auth } from "@/lib/auth";
import { MysteryBoxAnalytics } from "@/lib/mystery-box-analytics";
import { RecommendationAnalytics } from "@/lib/recommendation-analytics";
import { serializeProducts } from "@/lib/utils";
import { getLaunchFlags } from "@/lib/launch-flags";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { OperationalProductInfoTabs } from "@/components/product/operational-product-info-tabs";
import { calcDiscountPct, formatKWD } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sponsored?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      select: {
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        saveoPrice: true,
        status: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    getLocale(),
  ]);

  if (!product || product.status === "ARCHIVED") return { title: "Product not found" };

  const name = locale === "ar" && product.nameAr ? product.nameAr : product.name;
  const description = locale === "ar" && product.descriptionAr ? product.descriptionAr : product.description;
  const image = product.images[0]?.url;

  return {
    title: name,
    description: description.slice(0, 160),
    alternates: { canonical: `/${locale}/products/${slug}` },
    openGraph: {
      title: name,
      description: description.slice(0, 160),
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: description.slice(0, 160),
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const FEATURE_FLAGS = await getLaunchFlags();
  const { slug } = await params;
  const { sponsored: sponsoredSlotId } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      media: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] },
      category: true,
      attributes: true,
      ingredients: { orderBy: { sortOrder: "asc" } },
      nutritionFact: true,
      badges: true,
      storySteps: { orderBy: { sortOrder: "asc" } },
      flavorProfile: true,
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { helpfulCount: "desc" },
        take: 20,
        include: { user: { select: { name: true } }, media: true, replies: true },
      },
    },
  });

  if (!product || product.status === "ARCHIVED") notFound();

  const [crossSell, upsell, related, fbt, bundles, p, locale, flashDeal, sponsoredCampaign, session, comparison, sponsoredSlotLookup] = await Promise.all([
    getCrossSell(product.id),
    getUpsell(product.id),
    getRelatedProducts(product.id),
    getFrequentlyBoughtTogether(product.id),
    BundleService.getBundlesForProduct(product.id),
    getTranslations("product"),
    getLocale(),
    FlashDealService.getLiveDealForProduct(product.id),
    prisma.brandCampaign.findFirst({
      where: { type: "SPONSORED_PRODUCT", productId: product.id, isActive: true, startDate: { lte: new Date() }, endDate: { gt: new Date() } },
    }),
    auth(),
    SmartComparisonService.getComparableProducts(product.id, 3),
    sponsoredSlotId ? prisma.sponsoredSlot.findUnique({ where: { id: sponsoredSlotId }, select: { id: true, brandId: true } }) : Promise.resolve(null),
  ]);

  // Phase 5 Product Quality Control: a product pending/rejected review is
  // invisible to the public, full stop — but the supplier who owns it
  // (to preview their own pending submission) and admins (to review it)
  // are allowed through. Rare path (most products are already APPROVED),
  // so this stays sequential rather than complicating the batch above.
  if (product.approvalStatus !== "APPROVED") {
    const role = session?.user?.role;
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    const isOwningSupplier =
      role === "SUPPLIER" &&
      !!(await prisma.supplier.findFirst({ where: { ownerUserId: session?.user?.id, id: product.supplierId } }));
    if (!isAdmin && !isOwningSupplier) notFound();
  }

  if (product.isMembersOnly) {
    const isMember = session?.user?.id ? await MembershipService.isActiveMember(session.user.id) : false;
    if (!isMember) notFound(); // never confirm to a non-member that this product exists
  }

  // Fire-and-forget view count increment
  prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  if (sponsoredCampaign) {
    BrandCampaignService.track(sponsoredCampaign.id, "VIEW", { userId: session?.user?.id });
  }

  // Brand Center (Phase 5.4 §14) — a visit from a sponsored slot link
  // counts as both a click-through (they clicked the sponsored card) and
  // a product view. Verifies the slot actually exists before recording
  // anything against its brand — never trusts the query param blindly.
  if (sponsoredSlotLookup) {
    SponsoredSlotService.recordClick(sponsoredSlotLookup.id, sponsoredSlotLookup.brandId, session?.user?.id);
    prisma.brandEvent.create({ data: { brandId: sponsoredSlotLookup.brandId, eventType: "PRODUCT_VIEW", userId: session?.user?.id, metadata: { slotId: sponsoredSlotLookup.id, productId: product.id } } }).catch(() => {});
  }

  // Fire-and-forget impression tracking, one event per shown recommendation.
  for (const item of crossSell) RecommendationAnalytics.viewed(item.id, "cross_sell", session?.user?.id);
  for (const item of upsell) RecommendationAnalytics.viewed(item.id, "upsell", session?.user?.id);
  for (const item of related) RecommendationAnalytics.viewed(item.id, "related_products", session?.user?.id);
  for (const item of fbt) RecommendationAnalytics.viewed(item.id, "frequently_bought_together", session?.user?.id);

  const displayName = locale === "ar" && product.nameAr ? product.nameAr : product.name;
  const displayDescription = locale === "ar" && product.descriptionAr ? product.descriptionAr : product.description;
  const categoryName = locale === "ar" && product.category.nameAr ? product.category.nameAr : product.category.name;
  const mysteryReveal = locale === "ar" && product.mysteryBoxRevealAr ? product.mysteryBoxRevealAr : product.mysteryBoxReveal;

  if (product.type === "MYSTERY_BOX") {
    MysteryBoxAnalytics.viewed(product.id, session?.user?.id);
  }

  return (
    <div className="pdp-page">
      <ViewTracker productId={product.id} />
      <div className="pdp-breadcrumb-strip">
        <nav className="pdp-breadcrumb v21-shell" aria-label="Breadcrumb">
          <Link href="/">{locale === "ar" ? "الرئيسية" : "Home"}</Link><span>/</span>
          <Link href={`/category/${product.category.slug}`}>{categoryName}</Link><span>/</span>
          <span>{displayName}</span>
        </nav>
      </div>
      <div className="pdp-main v21-shell">
        {/* Gallery */}
        <div className="pdp-gallery-column">
          {product.media.length > 0 ? (
            <ProductRevealWrapper experienceType={product.experienceType}>
              <PremiumProductGallery media={product.media} fallbackImage={product.images[0]?.url ?? null} productName={displayName} />
            </ProductRevealWrapper>
          ) : (
            <>
              <div className="pdp-gallery-frame">
                <Image
                  src={product.images[0]?.url ?? "/placeholder-product.svg"}
                  alt={displayName}
                  fill
                  sizes="(max-width: 900px) 100vw, 616px"
                  className="object-cover"
                  priority
                />
              </div>
              {product.images.length > 1 && (
                <div className="pdp-gallery-thumbs">
                  {product.images.map((img) => (
                    <div key={img.id}>
                      <Image src={img.url} alt={img.altText ?? displayName} fill sizes="64px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="pdp-purchase-panel">
          <div className="pdp-meta-chips"><Link href={`/category/${product.category.slug}`}>{categoryName}</Link>{product.type !== "STANDARD" && <span>{product.type.replaceAll("_", " ")}</span>}</div>
          <h1>{displayName}</h1>
          {product.nameAr && <p className="pdp-name-ar" dir="rtl" lang="ar">{product.nameAr}</p>}

          {product.dealEndsAt && (
            <div className="mt-3">
              <CountdownTimer dealEndsAt={product.dealEndsAt} />
            </div>
          )}

          <div className="pdp-price-panel">
            <PriceTag
              originalPrice={Number(product.originalPrice)}
              saveoPrice={Number(product.saveoPrice)}
              size="lg"
            />
            {Number(product.originalPrice) > Number(product.saveoPrice) && <p>You save {formatKWD(Number(product.originalPrice) - Number(product.saveoPrice))} · {calcDiscountPct(Number(product.originalPrice), Number(product.saveoPrice))}% off</p>}
          </div>

          {product.type === "RESCUE" && product.expiryDate && <aside className="pdp-rescue-panel"><strong>RESCUE DEAL</strong><div><b>Exceptional value, responsibly discovered.</b><p>{p("bestBefore", { date: new Date(product.expiryDate).toLocaleDateString(locale === "ar" ? "ar-KW" : "en-GB") })}</p></div></aside>}

          {product.type === "MYSTERY_BOX" && mysteryReveal && (
            <div className="mt-4 rounded-xl2 bg-saveo-emerald-50 p-4 text-sm">
              <p className="font-semibold text-saveo-emerald-800">{p("mysteryReveal")} 🎁</p>
              <p className="mt-1 text-saveo-emerald-700/70">{mysteryReveal}</p>
              {!!product.mysteryBoxChooseCount && product.mysteryBoxChooseCount > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-saveo-gold-700">
                  ✨ {locale === "ar"
                    ? `أنت تختار ${product.mysteryBoxChooseCount} من محتوياتك بنفسك — والباقي مفاجأة!`
                    : `You pick ${product.mysteryBoxChooseCount} of your items yourself — the rest is a surprise!`}
                </p>
              )}
              {product.mysteryBoxValueMin && product.mysteryBoxValueMax && (
                <p className="mt-1 text-xs text-saveo-emerald-700/50">
                  {p("estimatedValue")}: {Number(product.mysteryBoxValueMin).toFixed(3)}–
                  {Number(product.mysteryBoxValueMax).toFixed(3)} KD
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-saveo-emerald-700/10 pt-3">
                {product.stockQty > 0 && product.stockQty <= 20 && (
                  <span className="text-xs font-bold text-saveo-gold-700">
                    {locale === "ar" ? `متبقي ${product.stockQty} فقط` : `Only ${product.stockQty} left`}
                  </span>
                )}
                {product.dealEndsAt && new Date(product.dealEndsAt) > new Date() && (
                  <CountdownTimer dealEndsAt={product.dealEndsAt as any} compact />
                )}
              </div>
            </div>
          )}

          <p className="pdp-description-copy">{displayDescription}</p>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-saveo-emerald-700/50">
            {product.expiryDate && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                {p("bestBefore", { date: new Date(product.expiryDate).toLocaleDateString(locale === "ar" ? "ar-KW" : "en-GB") })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <PackageCheck className="h-4 w-4" />
              {product.stockQty > 0 ? p("inStock", { count: product.stockQty }) : p("outOfStock")}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              {p("verifiedSupplier")}
            </span>
          </div>

          <div className={`pdp-stock ${product.stockQty <= product.lowStockAlert ? "is-low" : ""}`}>
            <div><strong>{product.stockQty <= product.lowStockAlert ? (locale === "ar" ? `متبقي ${product.stockQty} فقط` : `Only ${product.stockQty} left`) : p("inStock", { count: product.stockQty })}</strong><span>{product.stockQty} available</span></div>
            <div><i style={{ width: `${Math.max(0, Math.min(100, Math.round((product.stockQty / Math.max(product.openingStock || product.stockQty, 1)) * 100)))}%` }} /></div>
          </div>

          {product.attributes.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-2 text-xs">
              {product.attributes.map((attr) => (
                <div key={attr.id} className="rounded-lg bg-saveo-emerald-700/[0.03] px-3 py-2">
                  <dt className="text-saveo-emerald-700/40">
                    {locale === "ar" && attr.keyAr ? attr.keyAr : attr.key}
                  </dt>
                  <dd className="font-semibold">
                    {locale === "ar" && attr.valueAr ? attr.valueAr : attr.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-3">
            <LiveProductSignals productId={product.id} lowStockAlert={product.lowStockAlert} />
          </div>

          {product.isSubscribable && (
            <div className="mt-3">
              <SubscribeAndSaveWidget productId={product.id} saveoPrice={Number(product.saveoPrice)} locale={locale} />
            </div>
          )}

          {flashDeal && (
            <div className="mt-4">
              <FlashDealBanner
                discountPercent={flashDeal.discountPercent}
                dealPrice={FlashDealService.effectivePrice(Number(product.saveoPrice), flashDeal.discountPercent)}
                originalPrice={Number(product.saveoPrice)}
                remaining={FlashDealService.getRemainingStock(flashDeal)}
                stockLimit={flashDeal.stockLimit}
                endAt={flashDeal.endAt}
                locale={locale}
              />
            </div>
          )}

          <div className="pdp-operational-purchase">
            <AddToCartPanel
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                image: product.images[0]?.url ?? "/placeholder-product.svg",
                originalPrice: Number(product.originalPrice),
                saveoPrice: Number(product.saveoPrice),
                stockQty: product.stockQty,
              }}
              isMysteryBox={product.type === "MYSTERY_BOX"}
              userId={session?.user?.id ?? null}
            />
          </div>

          <section className="pdp-supplier"><ShieldCheck className="h-6 w-6" /><div><p><strong>{p("verifiedSupplier")}</strong><span>Verified by SAVO</span></p><small>Supplier approval and product ownership remain controlled by the operational SAVO platform.</small></div></section>

          {bundles.length > 0 && (
            <div className="mt-6 space-y-4">
              {bundles.map((bundle) => {
                const pricing = BundleService.calculatePricing(bundle);
                const requiredProducts = pricing.requiredProducts.map((rp) => {
                  const item = bundle.items.find((i) => i.productId === rp.productId)!;
                  return { ...rp, slug: item.product.slug, image: item.product.images[0]?.url ?? null };
                });
                const rewardItem = bundle.items.find((i) => i.isRewardItem);
                return (
                  <BundleOffer
                    key={bundle.id}
                    locale={locale}
                    bundle={{
                      ...pricing,
                      discountType: bundle.discountType,
                      requiredProducts,
                      rewardProduct: pricing.rewardProduct && rewardItem
                        ? { ...pricing.rewardProduct, slug: rewardItem.product.slug, image: rewardItem.product.images[0]?.url ?? null }
                        : null,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <OperationalProductInfoTabs
        description={product.description}
        descriptionAr={product.descriptionAr}
        facts={product.attributes.map((attr) => ({ label: locale === "ar" && attr.keyAr ? attr.keyAr : attr.key, value: locale === "ar" && attr.valueAr ? attr.valueAr : attr.value }))}
      />

      {(() => {
        const lifestyleImage = product.media.find((m) => m.type === "LIFESTYLE_IMAGE");
        return lifestyleImage ? (
          <div className="mt-6">
            <ProductScene
              backgroundImage={lifestyleImage.url}
              productImage={product.images[0]?.url ?? "/placeholder-product.svg"}
              overlayText={product.experienceApproved && product.originStory ? product.originStory : displayName}
            />
          </div>
        ) : null;
      })()}

      <ProductStorySection
        productStory={product.experienceApproved ? product.productStory : null}
        originStory={product.experienceApproved ? product.originStory : null}
        highlightFeatures={product.experienceApproved ? (product.highlightFeatures as any) : null}
        locale={locale}
      />

      {product.badges.length > 0 && (
        <div className="mt-4"><ProductBadges badges={product.badges} locale={locale} /></div>
      )}

      {product.experienceApproved && (() => {
        const frames360 = product.media.filter((m) => m.type === "IMAGE_360");
        const videos = product.media.filter((m) => m.type === "VIDEO");
        const model3d = product.media.find((m) => m.type === "THREE_D_MODEL");
        return (
          <>
            {frames360.length > 0 && (
              <div className="mt-10 max-w-md"><Product360Viewer frames={frames360} /></div>
            )}
            {videos.length > 0 && (
              <div className="mt-10"><VideoCommercePlayer videos={videos} /></div>
            )}
            {model3d && (
              <div className="max-w-md"><ARModelViewer modelUrl={model3d.url} productName={displayName} /></div>
            )}
          </>
        );
      })()}

      {product.experienceApproved && product.ingredients.length > 0 && (
        <IngredientExplorer ingredients={product.ingredients} locale={locale} />
      )}

      {product.experienceApproved && product.nutritionFact && (
        <NutritionExperience fact={product.nutritionFact} locale={locale} />
      )}

      {product.experienceApproved && product.storySteps.length > 0 && (
        <StoryModeTimeline steps={product.storySteps} locale={locale} />
      )}

      <ReviewsSection productId={product.id} reviews={product.reviews as any} isSignedIn={!!session?.user} />

      {product.experienceApproved && product.flavorProfile && (
        <FlavorJourney profile={product.flavorProfile} locale={locale} />
      )}

      <SmartComparison current={comparison.current} alternatives={comparison.alternatives} locale={locale} />

      {/* Frequently bought together (Smart Cross Selling) */}
      {FEATURE_FLAGS.SMART_CROSS_SELLING_ENABLED && fbt.length > 1 && <FrequentlyBoughtTogether items={serializeProducts(fbt) as any} />}

      {/* Cross-sell: complementary items (e.g. chocolate -> juice, snacks) */}
      <ProductRail
        title={p("crossSellTitle")}
        products={serializeProducts(crossSell) as any}
        source="cross_sell"
      />

      {/* Upsell */}
      <ProductRail
        title={p("upsellTitle")}
        products={serializeProducts(upsell) as any}
        source="upsell"
      />

      {/* Related */}
      <ProductRail title={p("relatedTitle")} products={serializeProducts(related) as any} source="related_products" />
    </div>
  );
}
