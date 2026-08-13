import { prisma } from "@/lib/prisma";
import type { SupplierTransactionStatus } from "@prisma/client";

/**
 * BIAggregationService — Phase 7.1
 *
 * Materializes BusinessMetricSnapshot rows from real transactional
 * data — same GMV/Realized convention as BusinessDashboardService
 * (Phase 6.10), reused rather than redefined. Written for a scheduled
 * job (nightly rollup); safely re-runnable on-demand since each period
 * is upserted, never duplicated.
 */
const REALIZED_STATUSES: SupplierTransactionStatus[] = ["COMPLETED", "SETTLED"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

export class BIAggregationService {
  private static async computeForPeriod(periodStart: Date, periodEnd: Date) {
    const [gmvAgg, realizedTxns, orders, expenses] = await Promise.all([
      prisma.supplierTransaction.aggregate({
        where: { status: { not: "REVERSED" }, createdAt: { gte: periodStart, lt: periodEnd } },
        _sum: { saleAmount: true },
      }),
      prisma.supplierTransaction.findMany({
        where: { status: { in: REALIZED_STATUSES }, createdAt: { gte: periodStart, lt: periodEnd } },
        select: { commissionAmount: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: periodStart, lt: periodEnd }, status: { not: "CANCELLED" } },
        select: { userId: true, total: true },
      }),
      prisma.expense.aggregate({ where: { date: { gte: periodStart, lt: periodEnd } }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    ]);

    const gmv = Number(gmvAgg._sum.saleAmount ?? 0);
    const netRevenue = realizedTxns.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
    const grossProfit = netRevenue - Number(expenses._sum.amount ?? 0);
    const orderCount = orders.length;
    const customers = new Set(orders.map((o) => o.userId)).size;
    const averageOrderValue = orderCount > 0 ? orders.reduce((s, o) => s + Number(o.total), 0) / orderCount : 0;

    return {
      gmv: Number(gmv.toFixed(3)),
      netRevenue: Number(netRevenue.toFixed(3)),
      grossProfit: Number(grossProfit.toFixed(3)),
      orders: orderCount,
      customers,
      averageOrderValue: Number(averageOrderValue.toFixed(3)),
    };
  }

  static async rollupDay(date: Date) {
    const periodStart = startOfDay(date);
    const periodEnd = new Date(periodStart); periodEnd.setDate(periodEnd.getDate() + 1);
    const metrics = await this.computeForPeriod(periodStart, periodEnd);
    return prisma.businessMetricSnapshot.upsert({
      where: { granularity_periodStart: { granularity: "DAILY", periodStart } },
      create: { granularity: "DAILY", periodStart, ...metrics },
      update: metrics,
    });
  }

  static async rollupWeek(date: Date) {
    const periodStart = startOfWeek(date);
    const periodEnd = new Date(periodStart); periodEnd.setDate(periodEnd.getDate() + 7);
    const metrics = await this.computeForPeriod(periodStart, periodEnd);
    return prisma.businessMetricSnapshot.upsert({
      where: { granularity_periodStart: { granularity: "WEEKLY", periodStart } },
      create: { granularity: "WEEKLY", periodStart, ...metrics },
      update: metrics,
    });
  }

  static async rollupMonth(date: Date) {
    const periodStart = startOfMonth(date);
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);
    const metrics = await this.computeForPeriod(periodStart, periodEnd);
    return prisma.businessMetricSnapshot.upsert({
      where: { granularity_periodStart: { granularity: "MONTHLY", periodStart } },
      create: { granularity: "MONTHLY", periodStart, ...metrics },
      update: metrics,
    });
  }

  static async rollupAll(referenceDate = new Date()) {
    const [daily, weekly, monthly] = await Promise.all([
      this.rollupDay(referenceDate),
      this.rollupWeek(referenceDate),
      this.rollupMonth(referenceDate),
    ]);
    return { daily, weekly, monthly };
  }

  static async backfillDays(days: number) {
    let count = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      await this.rollupDay(d);
      count++;
    }
    return { backfilled: count };
  }
}
