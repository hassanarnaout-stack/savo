/**
 * BRAND SUMMARY
 * ============================================================
 * Pre-computation strategy: one bulk Product query grouped by
 * brandName, one bulk OrderItem revenue query — aggregated in
 * memory per brand.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { BrandSummary, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

export async function buildBrandSummaries(): Promise<{ summaries: BrandSummary[]; stats: BuildStats }> {
  const start = Date.now();
  let queryCount = 0;

  const [products, reviewAggs, itemRows] = await Promise.all([
    prisma.product.findMany({
      where: { brandName: { not: null } },
      select: { id: true, brandName: true, status: true },
    }).then((r) => { queryCount++; return r; }),
    prisma.review.groupBy({ by: ["productId"], where: { status: "APPROVED" }, _avg: { rating: true }, _count: { rating: true } })
      .then((r) => { queryCount++; return r; }),
    prisma.orderItem.findMany({
      select: { productId: true, lineTotal: true, quantity: true, supplierOrder: { select: { orderId: true, order: { select: { userId: true, status: true } } } } },
    }).then((r) => { queryCount++; return r; }),
  ]);

  const reviewByProduct = new Map(reviewAggs.map((r) => [r.productId, r]));
  const productToBrand = new Map(products.filter((p) => p.brandName).map((p) => [p.id, p.brandName as string]));

  interface BrandAgg { productIds: Set<string>; revenue: number; units: number; orders: Set<string>; customers: Set<string>; customerOrderCounts: Map<string, number>; }
  const byBrand = new Map<string, BrandAgg>();

  for (const p of products) {
    if (!p.brandName) continue;
    if (!byBrand.has(p.brandName)) byBrand.set(p.brandName, { productIds: new Set(), revenue: 0, units: 0, orders: new Set(), customers: new Set(), customerOrderCounts: new Map() });
    byBrand.get(p.brandName)!.productIds.add(p.id);
  }

  for (const item of itemRows) {
    const brand = productToBrand.get(item.productId);
    if (!brand) continue;
    const agg = byBrand.get(brand);
    if (!agg || item.supplierOrder.order.status === "CANCELLED") continue;
    agg.revenue += Number(item.lineTotal);
    agg.units += item.quantity;
    agg.orders.add(item.supplierOrder.orderId);
    agg.customers.add(item.supplierOrder.order.userId);
    agg.customerOrderCounts.set(
      item.supplierOrder.order.userId,
      (agg.customerOrderCounts.get(item.supplierOrder.order.userId) ?? 0) + 1
    );
  }

  const summaries: BrandSummary[] = Array.from(byBrand.entries()).map(([brandName, agg]) => {
    const productIds = Array.from(agg.productIds);
    const ratings = productIds.map((id) => reviewByProduct.get(id)).filter((r): r is NonNullable<typeof r> => !!r?._avg.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + (r._avg.rating ?? 0), 0) / ratings.length : null;
    const repeatCustomers = Array.from(agg.customerOrderCounts.values()).filter((c) => c >= 2).length;
    const repeatPurchaseRate = agg.customers.size > 0 ? Number((repeatCustomers / agg.customers.size).toFixed(4)) : null;

    const revenuePart = Math.min(agg.revenue, 2000) / 20;
    const ratingPart = avgRating !== null ? (avgRating / 5) * 100 : 60;
    const brandScore = Math.round(Math.max(0, Math.min(100, revenuePart * 0.5 + ratingPart * 0.3 + Math.min(productIds.length, 10) * 2)));

    return {
      brandId: brandName,
      brandName,
      productCount: productIds.length,
      unitsSold: agg.units,
      ordersCount: agg.orders.size,
      revenue: Number(agg.revenue.toFixed(3)),
      averageProductRating: avgRating !== null ? Number(avgRating.toFixed(2)) : null,
      returnRate: null,
      customerCount: agg.customers.size,
      repeatPurchaseRate,
      brandScore,
      lastUpdated: new Date().toISOString(),
    };
  });

  const stats: BuildStats = { recordsProcessed: summaries.length, queryCount, durationMs: Date.now() - start };
  for (const s of summaries) warehouseCache.set(cacheKey("brand", s.brandId), s, stats);

  return { summaries, stats };
}

export function getBrandSummary(brandName: string): BrandSummary | null {
  return warehouseCache.get<BrandSummary>(cacheKey("brand", brandName));
}
