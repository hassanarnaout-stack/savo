/**
 * BRAND / CATEGORY ACCESS
 * ============================================================
 * Both read the Data Warehouse's existing BrandSummary/
 * CategorySummary — never recompute product/order aggregation.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { getBrandSummary, getCategorySummary } from "@/lib/data-warehouse";
import { accessCache } from "./access-cache";
import { BrandIntelligenceData, CategoryIntelligenceData, DataFreshness } from "./types";

export async function getBrandIntelligence(brandName: string): Promise<BrandIntelligenceData | null> {
  const cached = accessCache.get<BrandIntelligenceData>("BRAND_INTELLIGENCE", brandName);
  if (cached) return cached.data;

  const warehouseSummary = getBrandSummary(brandName);
  if (!warehouseSummary) return null;

  const popularProducts = await prisma.product.findMany({
    where: { brandName, status: "ACTIVE" },
    orderBy: { orderCount: "desc" },
    take: 5,
    select: { id: true, name: true },
  });

  const freshness: DataFreshness = { source: "DATA_WAREHOUSE", generatedAt: warehouseSummary.lastUpdated, dataAgeMs: Date.now() - new Date(warehouseSummary.lastUpdated).getTime() };

  const result: BrandIntelligenceData = {
    brandId: brandName,
    brandName,
    brandScore: warehouseSummary.brandScore,
    popularProducts: popularProducts.map((p) => ({ productId: p.id, productName: p.name })),
    customerInterest: warehouseSummary.customerCount,
    category: null,
    freshness,
  };

  accessCache.set("BRAND_INTELLIGENCE", brandName, result);
  return result;
}

export async function getCategoryIntelligence(categoryId: string): Promise<CategoryIntelligenceData | null> {
  const cached = accessCache.get<CategoryIntelligenceData>("CATEGORY_INTELLIGENCE", categoryId);
  if (cached) return cached.data;

  const warehouseSummary = getCategorySummary(categoryId);
  if (!warehouseSummary) return null;

  const [popularProducts, brandCounts] = await Promise.all([
    prisma.product.findMany({ where: { categoryId, status: "ACTIVE" }, orderBy: { orderCount: "desc" }, take: 5, select: { id: true, name: true } }),
    prisma.product.groupBy({ by: ["brandName"], where: { categoryId, status: "ACTIVE", brandName: { not: null } }, _count: true, orderBy: { _count: { brandName: "desc" } }, take: 5 }),
  ]);

  const freshness: DataFreshness = { source: "DATA_WAREHOUSE", generatedAt: warehouseSummary.lastUpdated, dataAgeMs: Date.now() - new Date(warehouseSummary.lastUpdated).getTime() };

  let trend: CategoryIntelligenceData["trend"] = null;
  if (warehouseSummary.growthRate !== null) {
    trend = warehouseSummary.growthRate > 5 ? "GROWING" : warehouseSummary.growthRate < -5 ? "DECLINING" : "STABLE";
  }

  const result: CategoryIntelligenceData = {
    categoryId,
    categoryName: warehouseSummary.categoryName,
    categoryScore: warehouseSummary.categoryScore,
    demand: warehouseSummary.demandScore,
    popularProducts: popularProducts.map((p) => ({ productId: p.id, productName: p.name })),
    popularBrands: brandCounts.map((b) => b.brandName as string),
    trend,
    freshness,
  };

  accessCache.set("CATEGORY_INTELLIGENCE", categoryId, result);
  return result;
}
