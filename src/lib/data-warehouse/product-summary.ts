/**
 * PRODUCT SUMMARY
 * ============================================================
 * Pre-computation strategy: one bulk Product query, one bulk
 * groupBy for reviews, one bulk ReturnRequest scan (via the real
 * Order -> supplierOrders -> items path) — aggregated in memory
 * per product, not queried per product.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { ProductSummary, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

export async function buildProductSummaries(): Promise<{ summaries: ProductSummary[]; stats: BuildStats }> {
  const start = Date.now();
  let queryCount = 0;

  const [products, reviewAggs, returnRows, itemRevenue] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, name: true, categoryId: true, brandName: true, orderCount: true, saveoPrice: true, status: true, supplierId: true },
    }).then((r) => { queryCount++; return r; }),
    prisma.review.groupBy({
      by: ["productId"],
      where: { status: "APPROVED" },
      _avg: { rating: true },
      _count: { rating: true },
    }).then((r) => { queryCount++; return r; }),
    prisma.returnRequest.findMany({
      select: { order: { select: { supplierOrders: { select: { items: { select: { productId: true } } } } } } },
    }).then((r) => { queryCount++; return r; }),
    // Real revenue per product = sum of OrderItem.lineTotal, the actual
    // amount charged at time of purchase — not orderCount x current
    // price, which would drift silently if the price ever changed.
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { lineTotal: true, quantity: true },
    }).then((r) => { queryCount++; return r; }),
  ]);

  const revenueByProduct = new Map(itemRevenue.map((r) => [r.productId, { revenue: Number(r._sum.lineTotal ?? 0), units: r._sum.quantity ?? 0 }]));

  const reviewByProduct = new Map(reviewAggs.map((r) => [r.productId, { avg: r._avg.rating, count: r._count.rating }]));

  const returnCountByProduct = new Map<string, number>();
  for (const rr of returnRows) {
    const productIds = new Set<string>();
    for (const so of rr.order.supplierOrders) {
      for (const item of so.items) productIds.add(item.productId);
    }
    for (const pid of productIds) {
      returnCountByProduct.set(pid, (returnCountByProduct.get(pid) ?? 0) + 1);
    }
  }

  const summaries: ProductSummary[] = products.map((p) => {
    const review = reviewByProduct.get(p.id);
    const returnCount = returnCountByProduct.get(p.id) ?? 0;
    const returnRate = p.orderCount > 0 ? Number((returnCount / p.orderCount).toFixed(4)) : null;
    const realRevenue = revenueByProduct.get(p.id);
    const revenue = realRevenue?.revenue ?? 0;
    const unitsSold = realRevenue?.units ?? 0;

    const salesPart = Math.min(p.orderCount, 50) * 2;
    const reviewPart = review?.avg ? (review.avg / 5) * 100 : 60;
    const returnPart = returnRate !== null ? Math.max(0, 100 - returnRate * 300) : 70;
    const demandScore = Math.round(Math.max(0, Math.min(100, salesPart)));
    const productScore = Math.round(Math.max(0, Math.min(100, salesPart * 0.4 + reviewPart * 0.4 + returnPart * 0.2)));

    return {
      productId: p.id,
      productName: p.name,
      categoryId: p.categoryId ?? null,
      brandId: p.brandName ?? null,
      supplierCount: p.supplierId ? 1 : 0,
      unitsSold,
      ordersCount: p.orderCount,
      revenue: Number(revenue.toFixed(3)),
      averageSellingPrice: unitsSold > 0 ? Number((revenue / unitsSold).toFixed(3)) : Number(p.saveoPrice),
      averageRating: review?.avg ? Number(review.avg.toFixed(2)) : null,
      reviewCount: review?.count ?? 0,
      returnRate,
      cancellationRate: null,
      conversionRate: null,
      stockStatus: p.status,
      demandScore,
      productScore,
      lastUpdated: new Date().toISOString(),
    };
  });

  const stats: BuildStats = { recordsProcessed: summaries.length, queryCount, durationMs: Date.now() - start };
  for (const s of summaries) warehouseCache.set(cacheKey("product", s.productId), s, stats);

  return { summaries, stats };
}

export function getProductSummary(productId: string): ProductSummary | null {
  return warehouseCache.get<ProductSummary>(cacheKey("product", productId));
}
