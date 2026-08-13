import { prisma } from "@/lib/prisma";
import { RelationType } from "@prisma/client";
import { CrossSellService } from "@/lib/services/cross-sell-service";

/**
 * Backward-compatible facade over the Phase 4.3 service layer
 * (CrossSellService, RecommendationService, BundleService — see
 * src/lib/services/). Existing call sites (product page, homepage, the
 * cart's "complete your deal" API) keep working unchanged; new code
 * should import the services directly for the fuller API surface
 * (e.g. CrossSellService.getCoPurchasedProducts).
 */

const productCardSelect = {
  id: true,
  name: true,
  nameAr: true,
  slug: true,
  originalPrice: true,
  saveoPrice: true,
  discountPct: true,
  stockQty: true,
  type: true,
  dealEndsAt: true,
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
};

async function getCategoryFallback(productId: string, take: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true },
  });
  if (!product) return [];

  return prisma.product.findMany({
    where: { categoryId: product.categoryId, id: { not: productId }, status: "ACTIVE", approvalStatus: "APPROVED" },
    take,
    orderBy: { orderCount: "desc" },
    select: productCardSelect,
  });
}

export async function getCrossSell(productId: string) {
  const relations = await prisma.productRelation.findMany({
    where: { sourceId: productId, type: RelationType.CROSS_SELL },
    orderBy: { sortOrder: "asc" },
    take: 6,
    include: { target: { select: productCardSelect } },
  });
  if (relations.length === 0) return getCategoryFallback(productId, 6);
  return relations.map((r) => r.target);
}

export async function getUpsell(productId: string) {
  const relations = await prisma.productRelation.findMany({
    where: { sourceId: productId, type: RelationType.UPSELL },
    orderBy: { sortOrder: "asc" },
    take: 6,
    include: { target: { select: productCardSelect } },
  });
  if (relations.length === 0) return getCategoryFallback(productId, 6);
  return relations.map((r) => r.target);
}

/** Now backed by CrossSellService — real order co-occurrence first, then
 * the full documented fallback chain (curated -> category -> supplier -> best sellers). */
export async function getFrequentlyBoughtTogether(productId: string) {
  return CrossSellService.getFrequentlyBoughtTogether(productId, 3);
}

/** Now backed by CrossSellService — curated -> same brand -> same category -> same supplier. */
export async function getRelatedProducts(productId: string) {
  return CrossSellService.getRelatedProducts(productId, 8);
}

/** Now backed by CrossSellService's Smart Cart Suggestions (curated ->
 * category-pairing rules -> same-category best sellers). */
export async function getCompleteYourDeal(cartProductIds: string[], take = 6) {
  return CrossSellService.getSmartCartSuggestions(cartProductIds, take);
}
