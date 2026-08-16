import { prisma } from "@/lib/prisma";
import { RelationType } from "@prisma/client";
import { CrossSellService, type ProductCard } from "@/lib/services/cross-sell-service";

const productCardSelect = {
  id: true, name: true, nameAr: true, slug: true, originalPrice: true, saveoPrice: true,
  discountPct: true, stockQty: true, type: true, dealEndsAt: true,
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
};

async function getCategoryFallback(productId: string, take: number, knownCategoryId?: string) {
  const categoryId = knownCategoryId ?? (await prisma.product.findUnique({ where: { id: productId }, select: { categoryId: true } }))?.categoryId;
  if (!categoryId) return [];
  return prisma.product.findMany({
    where: { categoryId, id: { not: productId }, status: "ACTIVE", approvalStatus: "APPROVED" },
    take, orderBy: { orderCount: "desc" }, select: productCardSelect,
  });
}

export async function getCrossSell(productId: string, knownCategoryId?: string) {
  const relations = await prisma.productRelation.findMany({
    where: { sourceId: productId, type: RelationType.CROSS_SELL }, orderBy: { sortOrder: "asc" }, take: 6,
    include: { target: { select: productCardSelect } },
  });
  if (relations.length === 0) return getCategoryFallback(productId, 6, knownCategoryId);
  return relations.map((r) => r.target);
}

export async function getUpsell(productId: string, knownCategoryId?: string) {
  const relations = await prisma.productRelation.findMany({
    where: { sourceId: productId, type: RelationType.UPSELL }, orderBy: { sortOrder: "asc" }, take: 6,
    include: { target: { select: productCardSelect } },
  });
  if (relations.length === 0) return getCategoryFallback(productId, 6, knownCategoryId);
  return relations.map((r) => r.target);
}

export async function getFrequentlyBoughtTogether(productId: string, knownAnchor?: ProductCard & { categoryId: string; supplierId: string }) {
  return CrossSellService.getFrequentlyBoughtTogether(productId, 3, knownAnchor);
}

export async function getRelatedProducts(productId: string, knownAnchor?: { categoryId: string; brand: string | null; supplierId: string }) {
  return CrossSellService.getRelatedProducts(productId, 8, knownAnchor);
}

export async function getCompleteYourDeal(cartProductIds: string[], take = 6) {
  return CrossSellService.getSmartCartSuggestions(cartProductIds, take);
}
