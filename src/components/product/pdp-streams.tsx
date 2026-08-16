/**
 * PDP Performance Phase 2 — streaming boundaries.
 * ============================================================
 * Each export below is its own async Server Component with its OWN
 * data fetch inside it — NOT pre-resolved data passed into a
 * Suspense wrapper. That distinction is what actually makes this
 * stream: React can flush the PRODUCT HERO (rendered synchronously
 * in page.tsx, no await inside these functions blocks it) and send
 * each of these sections down the wire the moment its own fetch
 * resolves, independently of the others.
 *
 * `knownAnchor` is the same product row page.tsx already fetched for
 * the hero — passed straight through so these streams don't re-query
 * the database for data already in memory (preserves the PDP
 * Performance Phase 1 optimization).
 *
 * Analytics "viewed" impressions for recommendation items moved here
 * from page.tsx: they only make sense once each stream's own data is
 * actually resolved, and fire-and-forget (no `await`) exactly as
 * before — not part of what the user waits on either way.
 */
import { getCrossSell, getUpsell, getRelatedProducts, getFrequentlyBoughtTogether } from "@/lib/recommendations";
import type { ProductCard } from "@/lib/services/cross-sell-service";
import { SmartComparisonService } from "@/lib/services/smart-comparison-service";
import { prisma } from "@/lib/prisma";
import { ReviewsSection } from "@/components/product/reviews-section";
import { SmartComparison } from "@/components/product/smart-comparison";
import { FrequentlyBoughtTogether } from "@/components/product/frequently-bought-together";
import { ProductRail, ProductGrid } from "@/components/product/product-grid";
import { RecommendationAnalytics } from "@/lib/recommendation-analytics";
import { serializeProducts } from "@/lib/utils";

export type PdpKnownAnchor = ProductCard & { categoryId: string; supplierId: string; brand: string | null };

export async function PdpReviewsStream({ productId, isSignedIn }: { productId: string; isSignedIn: boolean }) {
  const reviews = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: { helpfulCount: "desc" },
    take: 20,
    include: { user: { select: { name: true } }, media: true, replies: true },
  });
  return <ReviewsSection productId={productId} reviews={reviews as any} isSignedIn={isSignedIn} />;
}

export async function PdpComparisonStream({ productId, locale }: { productId: string; locale: string }) {
  const comparison = await SmartComparisonService.getComparableProducts(productId, 3);
  return <SmartComparison current={comparison.current} alternatives={comparison.alternatives} locale={locale} />;
}

export async function PdpFbtStream({ productId, knownAnchor, userId }: { productId: string; knownAnchor: PdpKnownAnchor; userId?: string }) {
  const fbt = await getFrequentlyBoughtTogether(productId, knownAnchor);
  if (fbt.length <= 1) return null;
  for (const item of fbt) RecommendationAnalytics.viewed(item.id, "frequently_bought_together", userId);
  return <FrequentlyBoughtTogether items={serializeProducts(fbt) as any} />;
}

export async function PdpCrossSellStream({ productId, categoryId, userId, title }: { productId: string; categoryId: string; userId?: string; title: string }) {
  const crossSell = await getCrossSell(productId, categoryId);
  for (const item of crossSell) RecommendationAnalytics.viewed(item.id, "cross_sell", userId);
  return <ProductRail title={title} products={serializeProducts(crossSell) as any} source="cross_sell" />;
}

export async function PdpUpsellStream({ productId, categoryId, userId, title }: { productId: string; categoryId: string; userId?: string; title: string }) {
  const upsell = await getUpsell(productId, categoryId);
  for (const item of upsell) RecommendationAnalytics.viewed(item.id, "upsell", userId);
  return <ProductRail title={title} products={serializeProducts(upsell) as any} source="upsell" />;
}

/** "Related Products" is a V22 grid (not a horizontal rail like the two
 * sections above it) — reuses the SAME canonical ProductGrid/ProductCard
 * as /products, not a separate implementation. */
export async function PdpRelatedStream({ productId, categoryId, brand, supplierId, userId, title }: { productId: string; categoryId: string; brand: string | null; supplierId: string; userId?: string; title: string }) {
  const related = await getRelatedProducts(productId, { categoryId, brand, supplierId });
  if (related.length === 0) return null;
  for (const item of related) RecommendationAnalytics.viewed(item.id, "related_products", userId);
  return (
    <section className="savo-pdp-section">
      <h2 className="savo-pdp-rail-title" style={{ marginBottom: 24 }}>{title}</h2>
      <ProductGrid products={serializeProducts(related) as any} />
    </section>
  );
}
