import { prisma } from "@/lib/prisma";
import type { SupplierTransactionStatus } from "@prisma/client";

/**
 * BusinessDashboardService — Phase 6.10
 *
 * Platform-wide version of the exact GMV/Realized Sales convention
 * established in src/lib/supplier-analytics.ts (Phase 3.4) — reused
 * here rather than redefined, so the CEO dashboard's numbers can never
 * silently disagree with the supplier-facing ones built on the same data.
 */
const REALIZED_STATUSES: SupplierTransactionStatus[] = ["COMPLETED", "SETTLED"];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export interface BusinessKPIs {
  gmv: number;
  realizedRevenue: number;
  supplierPayout: number;
  netProfit: number;
  totalOrders: number;
  totalCustomers: number;
  repeatPurchaseRate: number;
  averageBasketValue: number;
  brandRevenue: number;
}

export class BusinessDashboardService {
  static async getKPIs(periodDays = 30): Promise<BusinessKPIs> {
    const since = daysAgo(periodDays);

    const [gmvAgg, realizedTxns, orders, customerOrderCounts, brandRevenueAgg, expenses] = await Promise.all([
      prisma.supplierTransaction.aggregate({
        where: { status: { not: "REVERSED" }, createdAt: { gte: since } },
        _sum: { saleAmount: true },
      }),
      prisma.supplierTransaction.findMany({
        where: { status: { in: REALIZED_STATUSES }, createdAt: { gte: since } },
        select: { saleAmount: true, commissionAmount: true },
      }),
      prisma.order.findMany({ where: { createdAt: { gte: since }, status: { not: "CANCELLED" } }, select: { userId: true, total: true } }),
      prisma.order.groupBy({ by: ["userId"], where: { status: { not: "CANCELLED" } }, _count: { id: true } }),
      prisma.brandInvoice.aggregate({ where: { status: "PAID", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { date: { gte: since } }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    ]);

    const gmv = Number(gmvAgg._sum.saleAmount ?? 0);
    const realizedRevenue = realizedTxns.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
    const supplierPayout = realizedTxns.reduce((sum, t) => sum + (Number(t.saleAmount) - Number(t.commissionAmount)), 0);
    const netProfit = realizedRevenue - Number(expenses._sum.amount ?? 0);

    const totalOrders = orders.length;
    const totalCustomers = customerOrderCounts.length;
    const repeatCustomers = customerOrderCounts.filter((c) => c._count.id >= 2).length;
    const repeatPurchaseRate = totalCustomers > 0 ? Number(((repeatCustomers / totalCustomers) * 100).toFixed(1)) : 0;
    const averageBasketValue = totalOrders > 0 ? Number((orders.reduce((s, o) => s + Number(o.total), 0) / totalOrders).toFixed(3)) : 0;

    return {
      gmv: Number(gmv.toFixed(3)),
      realizedRevenue: Number(realizedRevenue.toFixed(3)),
      supplierPayout: Number(supplierPayout.toFixed(3)),
      netProfit: Number(netProfit.toFixed(3)),
      totalOrders,
      totalCustomers,
      repeatPurchaseRate,
      averageBasketValue,
      brandRevenue: Number(brandRevenueAgg._sum.amount ?? 0),
    };
  }

  static async getDailyTrend(days = 30) {
    const since = daysAgo(days);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
      select: { createdAt: true, total: true },
    });

    const byDay = new Map<string, { gmv: number; orders: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(key) ?? { gmv: 0, orders: 0 };
      existing.gmv += Number(o.total);
      existing.orders += 1;
      byDay.set(key, existing);
    }

    return Array.from(byDay.entries())
      .map(([date, v]) => ({ date, gmv: Number(v.gmv.toFixed(3)), orders: v.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  static async getTopSuppliers(limit = 10) {
    const suppliers = await prisma.supplier.findMany({
      select: {
        companyName: true,
        transactions: { where: { status: { in: REALIZED_STATUSES } }, select: { saleAmount: true, commissionAmount: true } },
      },
    });

    return suppliers
      .map((s) => ({
        name: s.companyName,
        revenue: s.transactions.reduce((sum, t) => sum + Number(t.saleAmount), 0),
        commission: s.transactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0),
      }))
      .filter((s) => s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}
