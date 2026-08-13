/**
 * PRODUCT ACCESS
 * ============================================================
 * getProductIntelligence reads the Data Warehouse's ProductSummary
 * (never recomputes sales/review aggregation). searchRelevantProducts
 * is a real, bounded catalog query — never returns the full catalog.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { getProductSummary } from "@/lib/data-warehouse";
import { accessCache } from "./access-cache";
import { ProductIntelligenceData, ProductSearchResultItem, DataFreshness } from "./types";

const MAX_SEARCH_RESULTS = 20;

export async function getProductIntelligence(productId: string): Promise<ProductIntelligenceData | null> {
  const cached = accessCache.get<ProductIntelligenceData>("PRODUCT_DATA", productId);
  if (cached) return cached.data;

  const warehouseSummary = getProductSummary(productId);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, categoryId: true, brandName: true, saveoPrice: true, status: true, category: { select: { name: true } } },
  });
  if (!product) return null;

  const freshness: DataFreshness = warehouseSummary
    ? { source: "DATA_WAREHOUSE", generatedAt: warehouseSummary.lastUpdated, dataAgeMs: Date.now() - new Date(warehouseSummary.lastUpdated).getTime() }
    : { source: "PRODUCT_DATA", generatedAt: new Date().toISOString(), dataAgeMs: 0 };

  let returnRisk: ProductIntelligenceData["returnRisk"] = null;
  if (warehouseSummary?.returnRate !== null && warehouseSummary?.returnRate !== undefined) {
    returnRisk = warehouseSummary.returnRate > 0.15 ? "HIGH" : warehouseSummary.returnRate > 0.05 ? "MEDIUM" : "LOW";
  }

  const result: ProductIntelligenceData = {
    productId: product.id,
    productName: product.name,
    category: product.category?.name ?? null,
    brand: product.brandName,
    price: Number(product.saveoPrice),
    available: product.status === "ACTIVE",
    rating: warehouseSummary?.averageRating ?? null,
    reviewCount: warehouseSummary?.reviewCount ?? 0,
    demandScore: warehouseSummary?.demandScore ?? null,
    productScore: warehouseSummary?.productScore ?? null,
    returnRisk,
    freshness,
  };

  accessCache.set("PRODUCT_DATA", productId, result);
  return result;
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  brand?: string;
  budget?: number;
  limit?: number;
  /** Migrated from the legacy ShoppingAssistantService — real filter on Product.discountPct > 0. */
  wantsDiscount?: boolean;
  /** Migrated from the legacy service — real filter on Product.isMembersOnly. Note: this only filters which products are shown; it does not itself verify the requester's membership status — actual purchase eligibility is still enforced by the existing, unmodified checkout flow. */
  membersOnly?: boolean;
  /** Migrated from the legacy service — real filter on Product.nutritionFact.dietTags (e.g. VEGAN, KETO_FRIENDLY). */
  dietTags?: string[];
}

export async function searchRelevantProducts(params: ProductSearchParams): Promise<ProductSearchResultItem[]> {
  const take = Math.min(Math.max(params.limit ?? 10, 1), MAX_SEARCH_RESULTS);

  const where: Record<string, unknown> = { status: "ACTIVE", approvalStatus: "APPROVED" };
  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: "insensitive" } },
      { nameAr: { contains: params.query, mode: "insensitive" } },
    ];
  }
  if (params.category) where.category = { name: { equals: params.category, mode: "insensitive" } };
  if (params.brand) where.brandName = { equals: params.brand, mode: "insensitive" };
  if (params.budget !== undefined) where.saveoPrice = { lte: params.budget };
  if (params.wantsDiscount) where.discountPct = { gt: 0 };
  if (params.membersOnly) where.isMembersOnly = true;
  if (params.dietTags && params.dietTags.length > 0) where.nutritionFact = { dietTags: { hasSome: params.dietTags } };

  const products = await prisma.product.findMany({
    where,
    orderBy: { orderCount: "desc" },
    take,
    select: {
      id: true, name: true, slug: true, saveoPrice: true, originalPrice: true, brandName: true, stockQty: true,
      category: { select: { name: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  const productIds = products.map((p) => p.id);
  const reviewAggs = productIds.length > 0
    ? await prisma.review.groupBy({ by: ["productId"], where: { productId: { in: productIds }, status: "APPROVED" }, _avg: { rating: true } })
    : [];
  const ratingByProduct = new Map(reviewAggs.map((r) => [r.productId, r._avg.rating]));

  return products.map((p) => ({
    productId: p.id,
    productName: p.name,
    slug: p.slug,
    price: Number(p.saveoPrice),
    originalPrice: Number(p.originalPrice),
    image: p.images[0]?.url ?? null,
    stockQty: p.stockQty,
    category: p.category.name,
    brand: p.brandName,
    rating: ratingByProduct.get(p.id) ?? null,
    hasActiveDeal: Number(p.saveoPrice) < Number(p.originalPrice),
  }));
}
