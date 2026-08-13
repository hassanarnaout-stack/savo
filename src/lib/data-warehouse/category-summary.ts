/**
 * CATEGORY SUMMARY
 * ============================================================
 * Same real bulk-query strategy as the other summaries.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { CategorySummary, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

export async function buildCategorySummaries(): Promise<{ summaries: CategorySummary[]; stats: BuildStats }> {
  const start = Date.now();
  let queryCount = 0;

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [categories, products, itemRows, reviewAggs, thisMonthItems, lastMonthItems] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true } }).then((r) => { queryCount++; return r; }),
    prisma.product.findMany({ select: { id: true, categoryId: true } }).then((r) => { queryCount++; return r; }),
    prisma.orderItem.findMany({
      select: { productId: true, lineTotal: true, quantity: true, supplierOrder: { select: { orderId: true, order: { select: { status: true } } } } },
    }).then((r) => { queryCount++; return r; }),
    prisma.review.groupBy({ by: ["productId"], where: { status: "APPROVED" }, _avg: { rating: true } }).then((r) => { queryCount++; return r; }),
    prisma.orderItem.findMany({
      where: { supplierOrder: { order: { createdAt: { gte: startOfThisMonth }, status: { not: "CANCELLED" } } } },
      select: { productId: true, lineTotal: true },
    }).then((r) => { queryCount++; return r; }),
    prisma.orderItem.findMany({
      where: { supplierOrder: { order: { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth }, status: { not: "CANCELLED" } } } },
      select: { productId: true, lineTotal: true },
    }).then((r) => { queryCount++; return r; }),
  ]);

  const productToCategory = new Map(products.map((p) => [p.id, p.categoryId]));
  const reviewByProduct = new Map(reviewAggs.map((r) => [r.productId, r._avg.rating]));

  interface CatAgg { productIds: Set<string>; revenue: number; units: number; orders: Set<string>; ratings: number[]; }
  const byCategory = new Map<string, CatAgg>();
  for (const p of products) {
    if (!byCategory.has(p.categoryId)) byCategory.set(p.categoryId, { productIds: new Set(), revenue: 0, units: 0, orders: new Set(), ratings: [] });
    byCategory.get(p.categoryId)!.productIds.add(p.id);
    const rating = reviewByProduct.get(p.id);
    if (rating) byCategory.get(p.categoryId)!.ratings.push(rating);
  }

  for (const item of itemRows) {
    const catId = productToCategory.get(item.productId);
    if (!catId || item.supplierOrder.order.status === "CANCELLED") continue;
    const agg = byCategory.get(catId);
    if (!agg) continue;
    agg.revenue += Number(item.lineTotal);
    agg.units += item.quantity;
    agg.orders.add(item.supplierOrder.orderId);
  }

  const thisMonthByCategory = new Map<string, number>();
  for (const item of thisMonthItems) {
    const catId = productToCategory.get(item.productId);
    if (!catId) continue;
    thisMonthByCategory.set(catId, (thisMonthByCategory.get(catId) ?? 0) + Number(item.lineTotal));
  }
  const lastMonthByCategory = new Map<string, number>();
  for (const item of lastMonthItems) {
    const catId = productToCategory.get(item.productId);
    if (!catId) continue;
    lastMonthByCategory.set(catId, (lastMonthByCategory.get(catId) ?? 0) + Number(item.lineTotal));
  }

  const summaries: CategorySummary[] = categories.map((c) => {
    const agg = byCategory.get(c.id) ?? { productIds: new Set<string>(), revenue: 0, units: 0, orders: new Set<string>(), ratings: [] as number[] };
    const avgRating = agg.ratings.length > 0 ? agg.ratings.reduce((s, r) => s + r, 0) / agg.ratings.length : null;
    const avgOrderValue = agg.orders.size > 0 ? Number((agg.revenue / agg.orders.size).toFixed(3)) : null;

    const thisMonthRevenue = thisMonthByCategory.get(c.id) ?? 0;
    const lastMonthRevenue = lastMonthByCategory.get(c.id) ?? 0;
    let growthRate: number | null = null;
    if (lastMonthRevenue > 0) {
      growthRate = Number((((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(2));
    }

    const breadthPart = Math.min(agg.productIds.size, 20) * 5;
    const demandPart = Math.min(agg.orders.size, 300) / 3;
    const demandScore = Math.round(Math.max(0, Math.min(100, demandPart)));
    const growthPart = growthRate !== null ? Math.max(0, Math.min(100, 50 + growthRate)) : 50;
    const categoryScore = Math.round(Math.max(0, Math.min(100, breadthPart * 0.25 + demandPart * 0.45 + growthPart * 0.3)));

    return {
      categoryId: c.id,
      categoryName: c.name,
      productCount: agg.productIds.size,
      unitsSold: agg.units,
      ordersCount: agg.orders.size,
      revenue: Number(agg.revenue.toFixed(3)),
      averageOrderValue: avgOrderValue,
      averageRating: avgRating !== null ? Number(avgRating.toFixed(2)) : null,
      returnRate: null,
      growthRate,
      demandScore,
      categoryScore,
      lastUpdated: new Date().toISOString(),
    };
  });

  const stats: BuildStats = { recordsProcessed: summaries.length, queryCount, durationMs: Date.now() - start };
  for (const s of summaries) warehouseCache.set(cacheKey("category", s.categoryId), s, stats);

  return { summaries, stats };
}

export function getCategorySummary(categoryId: string): CategorySummary | null {
  return warehouseCache.get<CategorySummary>(cacheKey("category", categoryId));
}
