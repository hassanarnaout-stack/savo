import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CountdownTimer } from "@/components/product/countdown-timer";
import { AddToCartPanel } from "@/components/product/add-to-cart-panel";
import { BundleService } from "@/lib/services/bundle-service";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { BrandCampaignService } from "@/lib/services/brand-campaign-service";
import { SponsoredSlotService } from "@/lib/services/sponsored-slot-service";
import { PremiumProductGallery } from "@/components/product/premium-product-gallery";
import { ProductStorySection } from "@/components/product/product-story-section";
import { ProductScene } from "@/components/product/product-scene";
import { ProductRevealWrapper } from "@/components/product/product-reveal-wrapper";
import { Product360Viewer } from "@/components/product/product-360-viewer";
import { VideoCommercePlayer } from "@/components/product/video-commerce-player";
import { IngredientExplorer } from "@/components/product/ingredient-explorer";
import { NutritionExperience } from "@/components/product/nutrition-experience";
import { ProductBadges } from "@/components/product/product-badges";
import { StoryModeTimeline } from "@/components/product/story-mode-timeline";
import { ARModelViewer } from "@/components/product/ar-model-viewer";
import { FlavorJourney } from "@/components/product/flavor-journey";
import { BundleOffer } from "@/components/product/bundle-offer";
import { SubscribeAndSaveWidget } from "@/components/product/subscribe-and-save-widget";
import { MembershipService } from "@/lib/services/membership-service";
import { ShieldCheck } from "lucide-react";
import { ViewTracker } from "@/components/product/view-tracker";
import { auth } from "@/lib/auth";
import { MysteryBoxAnalytics } from "@/lib/mystery-box-analytics";
import { getLaunchFlags } from "@/lib/launch-flags";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { OperationalProductInfoTabs } from "@/components/product/operational-product-info-tabs";
import { calcDiscountPct, formatKWD } from "@/lib/utils";
import { Suspense } from "react";
import { PdpReviewsStream, PdpComparisonStream, PdpFbtStream, PdpCrossSellStream, PdpUpsellStream, PdpRelatedStream, type PdpKnownAnchor } from "@/components/product/pdp-streams";
import { PdpSectionSkeleton } from "@/components/product/pdp-section-skeleton";

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
      select: { name: true, nameAr: true, description: true, descriptionAr: true, saveoPrice: true, status: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } },
    }),
    getLocale(),
  ]);
  if (!product || product.status === "ARCHIVED") return { title: "Product not found" };
  const name = locale === "ar" && product.nameAr ? product.nameAr : product.name;
  const description = (locale === "ar" && product.descriptionAr ? product.descriptionAr : product.description).slice(0, 160);
  const image = product.images[0]?.url;
  return {
    title: name, description,
    alternates: { canonical: `/${locale}/products/${slug}` },
    openGraph: { title: name, description, images: image ? [{ url: image }] : undefined, type: "website" },
    twitter: { card: "summary_large_image", title: name, description, images: image ? [image] : undefined },
  };
}

/**
 * PDP — V22 visual migration on top of the existing Suspense streaming
 * architecture. Source: the latest V22 export, src/ProductDetail.tsx.
 *
 * QA fix: the favorite button previously had no real toggle at all
 * (no onClick). `isFavorited` is now a real per-session lookup
 * against the Favorite table (same table product-card.tsx's toggle
 * reads/writes), passed into AddToCartPanel so the heart starts in
 * the correct state instead of always "not favorited".
 */
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
    },
  });

  if (!product || product.status === "ARCHIVED") notFound();

  const [bundles, p, locale, flashDeal, sponsoredCampaign, session, sponsoredSlotLookup, ratingAgg] = await Promise.all([
    BundleService.getBundlesForProduct(product.id),
    getTranslations("product"),
    getLocale(),
    FlashDealService.getLiveDealForProduct(product.id),
    prisma.brandCampaign.findFirst({ where: { type: "SPONSORED_PRODUCT", productId: product.id, isActive: true, startDate: { lte: new Date() }, endDate: { gt: new Date() } } }),
    auth(),
    sponsoredSlotId ? prisma.sponsoredSlot.findUnique({ where: { id: sponsoredSlotId }, select: { id: true, brandId: true } }) : Promise.resolve(null),
    prisma.review.aggregate({ where: { productId: product.id, status: "APPROVED" }, _avg: { rating: true }, _count: true }),
  ]);

  const isFavorited = session?.user?.id
    ? !!(await prisma.favorite.findUnique({ where: { userId_productId: { userId: session.user.id, productId: product.id } } }))
    : false;

  if (product.approvalStatus !== "APPROVED") {
    const role = session?.user?.role;
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    const isOwningSupplier = role === "SUPPLIER" && !!(await prisma.supplier.findFirst({ where: { ownerUserId: session?.user?.id, id: product.supplierId } }));
    if (!isAdmin && !isOwningSupplier) notFound();
  }
  if (product.isMembersOnly) {
    const isMember = session?.user?.id ? await MembershipService.isActiveMember(session.user.id) : false;
    if (!isMember) notFound();
  }

  prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  if (sponsoredCampaign) BrandCampaignService.track(sponsoredCampaign.id, "VIEW", { userId: session?.user?.id });
  if (sponsoredSlotLookup) {
    SponsoredSlotService.recordClick(sponsoredSlotLookup.id, sponsoredSlotLookup.brandId, session?.user?.id);
    prisma.brandEvent.create({ data: { brandId: sponsoredSlotLookup.brandId, eventType: "PRODUCT_VIEW", userId: session?.user?.id, metadata: { slotId: sponsoredSlotLookup.id, productId: product.id } } }).catch(() => {});
  }
  if (product.type === "MYSTERY_BOX") MysteryBoxAnalytics.viewed(product.id, session?.user?.id);

  const isArabic = locale === "ar";
  const displayName = isArabic && product.nameAr ? product.nameAr : product.name;
  const displayDescription = isArabic && product.descriptionAr ? product.descriptionAr : product.description;
  const categoryName = isArabic && product.category.nameAr ? product.category.nameAr : product.category.name;
  const mysteryReveal = isArabic && product.mysteryBoxRevealAr ? product.mysteryBoxRevealAr : product.mysteryBoxReveal;

  const originalPrice = Number(product.originalPrice);
  const saveoPrice = Number(product.saveoPrice);
  const discountPct = calcDiscountPct(originalPrice, saveoPrice);
  const savedAmount = originalPrice - saveoPrice;
  const outOfStock = product.stockQty <= 0;
  const lowStock = !outOfStock && product.stockQty <= product.lowStockAlert;
  const avgRating = ratingAgg._avg.rating;
  const reviewCount = ratingAgg._count;

  const knownAnchor: PdpKnownAnchor = {
    id: product.id, name: product.name, nameAr: product.nameAr, slug: product.slug,
    originalPrice: product.originalPrice, saveoPrice: product.saveoPrice, discountPct: product.discountPct,
    stockQty: product.stockQty, type: product.type, dealEndsAt: product.dealEndsAt,
    images: product.images.slice(0, 1),
    categoryId: product.categoryId, supplierId: product.supplierId, brand: product.brand,
  };

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="savo-pdp-page">
      <ViewTracker productId={product.id} />

      <nav className="savo-breadcrumb" aria-label="Breadcrumb">
        <Link href="/products">{isArabic ? "→ رجوع" : "← Back"}</Link>
        <span>/</span>
        <Link href={`/category/${product.category.slug}`}>{categoryName}</Link>
        <span>/</span>
        <span>{displayName}</span>
      </nav>

      <section className="savo-pdp-hero">
        <div className="savo-pdp-gallery">
          {product.media.length > 0 ? (
            <ProductRevealWrapper experienceType={product.experienceType}>
              <PremiumProductGallery media={product.media} fallbackImage={product.images[0]?.url ?? null} productName={displayName} discountPct={discountPct} />
            </ProductRevealWrapper>
          ) : (
            <PremiumProductGallery media={[]} fallbackImage={product.images[0]?.url ?? null} productName={displayName} discountPct={discountPct} />
          )}
        </div>

        <div className="savo-pdp-buy">
          <div className="savo-pdp-meta-row">
            <span className="savo-pdp-category">{categoryName}</span>
            <span className="savo-pdp-dot" />
            <span className="savo-pdp-brand">{product.brand ?? "SAVO"}</span>
            <span className="savo-pdp-verified"><ShieldCheck size={12} /> {isArabic ? "مورد موثق" : "Verified Supplier"}</span>
          </div>

          <h1 className="savo-pdp-title">{displayName}</h1>
          {!isArabic && product.nameAr && <div className="savo-pdp-title-ar" dir="rtl">{product.nameAr}</div>}

          {reviewCount > 0 && avgRating != null && (
            <div className="savo-pdp-rating">
              <span className="savo-pdp-stars">{"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}</span>
              <span className="savo-pdp-rating-value">{avgRating.toFixed(1)}</span>
              <span className="savo-pdp-rating-count">({reviewCount.toLocaleString()})</span>
            </div>
          )}

          {flashDeal ? (
            <div className="savo-pdp-flash">
              <div className="savo-pdp-flash-glow" />
              <div className="savo-pdp-flash-head">
                <span className="savo-pdp-flash-dot" />
                <span className="savo-pdp-flash-label">{isArabic ? "عرض فلاش" : "Flash Deal"}</span>
                <span className="savo-pdp-flash-pct">-{flashDeal.discountPercent}%</span>
              </div>
              <div className="savo-pdp-flash-prices">
                <span className="savo-pdp-flash-price">{formatKWD(FlashDealService.effectivePrice(saveoPrice, flashDeal.discountPercent))}</span>
                <span className="savo-pdp-flash-compare">{formatKWD(saveoPrice)}</span>
              </div>
              <div className="savo-pdp-flash-timer">
                <span>{isArabic ? "ينتهي خلال" : "Ends in"}</span>
                <CountdownTimer dealEndsAt={flashDeal.endAt} compact />
              </div>
              {FlashDealService.getRemainingStock(flashDeal) > 0 && flashDeal.stockLimit > 0 && (
                <div className="savo-pdp-flash-scarcity">
                  {isArabic ? `متبقي ${FlashDealService.getRemainingStock(flashDeal)} فقط` : `Only ${FlashDealService.getRemainingStock(flashDeal)} left`}
                </div>
              )}
            </div>
          ) : (
            <div className="savo-pdp-price-panel">
              <div className="savo-pdp-price-row">
                <span className="savo-pdp-price">{formatKWD(saveoPrice)}</span>
                {originalPrice > saveoPrice && <span className="savo-pdp-price-original">{formatKWD(originalPrice)}</span>}
              </div>
              {originalPrice > saveoPrice && (
                <p className="savo-pdp-saved">
                  {isArabic ? `وفّرت ${formatKWD(savedAmount)}` : `You save ${formatKWD(savedAmount)}`} · -{discountPct}%
                </p>
              )}
            </div>
          )}

          {product.type === "RESCUE" && product.expiryDate && (
            <div className="savo-pdp-rescue">
              <strong>{isArabic ? "عرض إنقاذ" : "RESCUE DEAL"}</strong>
              <div>
                <b>{isArabic ? "قيمة استثنائية، اكتُشفت بمسؤولية." : "Exceptional value, responsibly discovered."}</b>
                <p>{p("bestBefore", { date: new Date(product.expiryDate).toLocaleDateString(isArabic ? "ar-KW" : "en-GB") })}</p>
              </div>
            </div>
          )}

          {product.type === "MYSTERY_BOX" && mysteryReveal && (
            <div className="savo-pdp-mystery">
              <p className="savo-pdp-mystery-title">🎁 {p("mysteryReveal")}</p>
              <p className="savo-pdp-mystery-text">{mysteryReveal}</p>
              {!!product.mysteryBoxChooseCount && product.mysteryBoxChooseCount > 0 && (
                <p className="savo-pdp-mystery-choose">
                  ✨ {isArabic ? `أنت تختار ${product.mysteryBoxChooseCount} من محتوياتك بنفسك — والباقي مفاجأة!` : `You pick ${product.mysteryBoxChooseCount} of your items yourself — the rest is a surprise!`}
                </p>
              )}
              {product.mysteryBoxValueMin && product.mysteryBoxValueMax && (
                <p className="savo-pdp-mystery-value">
                  {p("estimatedValue")}: {formatKWD(Number(product.mysteryBoxValueMin))}–{formatKWD(Number(product.mysteryBoxValueMax))}
                </p>
              )}
            </div>
          )}

          {lowStock && (
            <div className="savo-pdp-stock-urgency">
              <span className="savo-pdp-stock-dot" />
              <span>{isArabic ? `${product.stockQty} قطع فقط متبقية` : `Only ${product.stockQty} left in stock`}</span>
            </div>
          )}

          <p className="savo-pdp-short-desc">{displayDescription}</p>

          <div className="savo-pdp-purchase-row">
            <AddToCartPanel
              product={{
                id: product.id, name: product.name, slug: product.slug,
                image: product.images[0]?.url ?? "/placeholder-product.svg",
                originalPrice, saveoPrice, stockQty: product.stockQty,
              }}
              isMysteryBox={product.type === "MYSTERY_BOX"}
              userId={session?.user?.id ?? null}
              isFavorited={isFavorited}
            />
          </div>

          {product.attributes.length > 0 && (
            <dl className="savo-pdp-quick-attrs">
              {product.attributes.slice(0, 4).map((attr) => (
                <div key={attr.id}>
                  <dt>{isArabic && attr.keyAr ? attr.keyAr : attr.key}</dt>
                  <dd>{isArabic && attr.valueAr ? attr.valueAr : attr.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="savo-pdp-supplier">
            <ShieldCheck size={22} />
            <div>
              <p><strong>{p("verifiedSupplier")}</strong><span>{isArabic ? "موثّق من سافو" : "Verified by SAVO"}</span></p>
              <small>{isArabic ? "الموافقة على المورد وملكية المنتج تبقى تحت إشراف منصة سافو التشغيلية." : "Supplier approval and product ownership remain controlled by the operational SAVO platform."}</small>
            </div>
          </div>

          {product.isSubscribable && (
            <div className="savo-pdp-subscribe">
              <SubscribeAndSaveWidget productId={product.id} saveoPrice={saveoPrice} locale={locale} />
            </div>
          )}

          {bundles.length > 0 && (
            <div className="savo-pdp-bundles">
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
                      rewardProduct: pricing.rewardProduct && rewardItem ? { ...pricing.rewardProduct, slug: rewardItem.product.slug, image: rewardItem.product.images[0]?.url ?? null } : null,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <OperationalProductInfoTabs
        description={product.description}
        descriptionAr={product.descriptionAr}
        facts={product.attributes.map((attr) => ({ label: isArabic && attr.keyAr ? attr.keyAr : attr.key, value: isArabic && attr.valueAr ? attr.valueAr : attr.value }))}
      />

      {(() => {
        const lifestyleImage = product.media.find((m) => m.type === "LIFESTYLE_IMAGE");
        return lifestyleImage ? (
          <div className="savo-pdp-scene">
            <ProductScene backgroundImage={lifestyleImage.url} productImage={product.images[0]?.url ?? "/placeholder-product.svg"} overlayText={product.experienceApproved && product.originStory ? product.originStory : displayName} />
          </div>
        ) : null;
      })()}

      <ProductStorySection
        productStory={product.experienceApproved ? product.productStory : null}
        originStory={product.experienceApproved ? product.originStory : null}
        highlightFeatures={product.experienceApproved ? (product.highlightFeatures as any) : null}
        locale={locale}
      />

      {product.badges.length > 0 && <div className="savo-pdp-badges"><ProductBadges badges={product.badges} locale={locale} /></div>}

      {product.experienceApproved && (() => {
        const frames360 = product.media.filter((m) => m.type === "IMAGE_360");
        const videos = product.media.filter((m) => m.type === "VIDEO");
        const model3d = product.media.find((m) => m.type === "THREE_D_MODEL");
        return (
          <>
            {frames360.length > 0 && <div className="savo-pdp-360"><Product360Viewer frames={frames360} /></div>}
            {videos.length > 0 && <div className="savo-pdp-video"><VideoCommercePlayer videos={videos} /></div>}
            {model3d && <div className="savo-pdp-ar"><ARModelViewer modelUrl={model3d.url} productName={displayName} /></div>}
          </>
        );
      })()}

      {product.experienceApproved && product.ingredients.length > 0 && <IngredientExplorer ingredients={product.ingredients} locale={locale} />}
      {product.experienceApproved && product.nutritionFact && <NutritionExperience fact={product.nutritionFact} locale={locale} />}
      {product.experienceApproved && product.storySteps.length > 0 && <StoryModeTimeline steps={product.storySteps} locale={locale} />}

      <Suspense fallback={<PdpSectionSkeleton variant="block" />}>
        <PdpReviewsStream productId={product.id} isSignedIn={!!session?.user} />
      </Suspense>

      {product.experienceApproved && product.flavorProfile && <FlavorJourney profile={product.flavorProfile} locale={locale} />}

      <Suspense fallback={<PdpSectionSkeleton variant="block" />}>
        <PdpComparisonStream productId={product.id} locale={locale} />
      </Suspense>

      {FEATURE_FLAGS.SMART_CROSS_SELLING_ENABLED && (
        <Suspense fallback={<PdpSectionSkeleton variant="block" />}>
          <PdpFbtStream productId={product.id} knownAnchor={knownAnchor} userId={session?.user?.id} />
        </Suspense>
      )}

      <Suspense fallback={<PdpSectionSkeleton variant="rail" />}>
        <PdpCrossSellStream productId={product.id} categoryId={product.categoryId} userId={session?.user?.id} title={p("crossSellTitle")} />
      </Suspense>
      <Suspense fallback={<PdpSectionSkeleton variant="rail" />}>
        <PdpUpsellStream productId={product.id} categoryId={product.categoryId} userId={session?.user?.id} title={p("upsellTitle")} />
      </Suspense>
      <Suspense fallback={<PdpSectionSkeleton variant="rail" />}>
        <PdpRelatedStream productId={product.id} categoryId={product.categoryId} brand={product.brand} supplierId={product.supplierId} userId={session?.user?.id} title={p("relatedTitle")} />
      </Suspense>
    </div>
  );
}
