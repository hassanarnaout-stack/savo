/**
 * ORDER SUMMARY
 * ============================================================
 * Order-count-focused view over the same real period boundaries
 * as revenue-summary.ts.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { OrderSummaryPeriod, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

const REALIZED_STATUSES = ["COMPLETED", "SETTLED"] as const;

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

async function computePeriod(periodStart: Date, periodEnd: Date, granularity: "DAILY" | "WEEKLY" | "MONTHLY"): Promise<{ summary: OrderSummaryPeriod; queryCount: number }> {
  const [orders, returnedOrders, supplierOrderCount, itemAgg, gmvAgg, realizedAgg] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: periodStart, lt: periodEnd } },
      select: { status: true, total: true },
    }),
    prisma.returnRequest.count({ where: { createdAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.supplierOrder.count({ where: { createdAt: { gte: periodStart, lt: periodEnd } } }),
    prisma.orderItem.aggregate({
      where: { supplierOrder: { order: { createdAt: { gte: periodStart, lt: periodEnd } } } },
      _sum: { quantity: true },
    }),
    prisma.supplierTransaction.aggregate({
      where: { status: { not: "REVERSED" }, createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { saleAmount: true },
    }),
    prisma.supplierTransaction.findMany({
      where: { status: { in: [...REALIZED_STATUSES] }, createdAt: { gte: periodStart, lt: periodEnd } },
      select: { saleAmount: true, commissionAmount: true },
    }),
  ]);

  const completedOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  const pendingOrders = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
  const nonCancelled = orders.filter((o) => o.status !== "CANCELLED");
  const avgOrderValue = nonCancelled.length > 0 ? nonCancelled.reduce((s, o) => s + Number(o.total), 0) / nonCancelled.length : null;

  const grossSales = Number(gmvAgg._sum.saleAmount ?? 0);
  const realizedSales = realizedAgg.reduce((s, t) => s + Number(t.saleAmount), 0);
  const commission = realizedAgg.reduce((s, t) => s + Number(t.commissionAmount), 0);

  return {
    summary: {
      date: periodStart.toISOString(),
      granularity,
      orders: orders.length,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      returnedOrders,
      grossSales: Number(grossSales.toFixed(3)),
      realizedSales: Number(realizedSales.toFixed(3)),
      commission: Number(commission.toFixed(3)),
      netSales: Number((realizedSales - commission).toFixed(3)),
      averageOrderValue: avgOrderValue !== null ? Number(avgOrderValue.toFixed(3)) : null,
      itemsSold: itemAgg._sum.quantity ?? 0,
      supplierOrders: supplierOrderCount,
      lastUpdated: new Date().toISOString(),
    },
    queryCount: 6,
  };
}

export async function buildOrderSummaries(referenceDate = new Date()): Promise<{ summaries: OrderSummaryPeriod[]; stats: BuildStats }> {
  const start = Date.now();

  const dayStart = startOfDay(referenceDate);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const [daily, weekly, monthly] = await Promise.all([
    computePeriod(dayStart, dayEnd, "DAILY"),
    computePeriod(weekStart, weekEnd, "WEEKLY"),
    computePeriod(monthStart, monthEnd, "MONTHLY"),
  ]);

  const summaries = [daily.summary, weekly.summary, monthly.summary];
  const stats: BuildStats = {
    recordsProcessed: summaries.length,
    queryCount: daily.queryCount + weekly.queryCount + monthly.queryCount,
    durationMs: Date.now() - start,
  };

  for (const s of summaries) warehouseCache.set(cacheKey("order", `${s.granularity}:${s.date}`), s, stats);

  return { summaries, stats };
}

export function getOrderSummary(granularity: "DAILY" | "WEEKLY" | "MONTHLY", dateIso: string): OrderSummaryPeriod | null {
  return warehouseCache.get<OrderSummaryPeriod>(cacheKey("order", `${granularity}:${dateIso}`));
}
