/**
 * REVENUE SUMMARY
 * ============================================================
 * CRITICAL CONSTRAINT: reuses BIAggregationService's exact real
 * financial convention — the same period boundary functions and
 * the same GMV/realized/commission math, so numbers here are
 * guaranteed identical to the existing BI system.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { RevenueSummaryPeriod, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

const REALIZED_STATUSES = ["COMPLETED", "SETTLED"] as const;

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

async function computePeriod(
  periodStart: Date,
  periodEnd: Date,
  granularity: "DAILY" | "WEEKLY" | "MONTHLY"
): Promise<{ summary: RevenueSummaryPeriod; queryCount: number }> {
  const [gmvAgg, realizedTxns, orders, refundAgg] = await Promise.all([
    prisma.supplierTransaction.aggregate({
      where: { status: { not: "REVERSED" }, createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { saleAmount: true },
    }),
    prisma.supplierTransaction.findMany({
      where: { status: { in: [...REALIZED_STATUSES] }, createdAt: { gte: periodStart, lt: periodEnd } },
      select: { commissionAmount: true, supplierAmount: true, saleAmount: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: periodStart, lt: periodEnd }, status: { not: "CANCELLED" } },
      select: { total: true },
    }),
    prisma.supplierTransaction.aggregate({
      where: { status: "REVERSED", createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { saleAmount: true },
    }),
  ]);

  const grossSales = Number(gmvAgg._sum.saleAmount ?? 0);
  const realizedSales = realizedTxns.reduce((s, t) => s + Number(t.saleAmount), 0);
  const commissions = realizedTxns.reduce((s, t) => s + Number(t.commissionAmount), 0);
  const supplierPayables = realizedTxns.reduce((s, t) => s + Number(t.supplierAmount), 0);
  const refunds = Number(refundAgg._sum.saleAmount ?? 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount > 0 ? orders.reduce((s, o) => s + Number(o.total), 0) / orderCount : null;

  return {
    summary: {
      date: periodStart.toISOString(),
      granularity,
      grossSales: Number(grossSales.toFixed(3)),
      realizedSales: Number(realizedSales.toFixed(3)),
      refunds: Number(refunds.toFixed(3)),
      commissions: Number(commissions.toFixed(3)),
      supplierPayables: Number(supplierPayables.toFixed(3)),
      saveoRevenue: Number(commissions.toFixed(3)),
      netRevenue: Number((commissions - refunds).toFixed(3)),
      orders: orderCount,
      averageOrderValue: avgOrderValue !== null ? Number(avgOrderValue.toFixed(3)) : null,
      lastUpdated: new Date().toISOString(),
    },
    queryCount: 4,
  };
}

export async function buildRevenueSummaries(referenceDate = new Date()): Promise<{ summaries: RevenueSummaryPeriod[]; stats: BuildStats }> {
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

  for (const s of summaries) warehouseCache.set(cacheKey("revenue", `${s.granularity}:${s.date}`), s, stats);

  return { summaries, stats };
}

export function getRevenueSummary(granularity: "DAILY" | "WEEKLY" | "MONTHLY", dateIso: string): RevenueSummaryPeriod | null {
  return warehouseCache.get<RevenueSummaryPeriod>(cacheKey("revenue", `${granularity}:${dateIso}`));
}
