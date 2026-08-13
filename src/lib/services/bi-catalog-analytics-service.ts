import { prisma } from "@/lib/prisma";

/**
 * BICatalogAnalyticsService — Phase 7.1
 *
 * "Sales by Region" uses the real governorate field already captured
 * on every Address at checkout — not simulated geography.
 */
export class BICatalogAnalyticsService {
  static async getTopCategories(limit = 10) {
    const items = await prisma.orderItem.findMany({
      where: { supplierOrder: { status: { not: "CANCELLED" } } },
      select: { lineTotal: true, quantity: true, product: { select: { category: { select: { name: true } } } } },
    });

    const byCategory = new Map<string, { revenue: number; unitsSold: number }>();
    for (const item of items) {
      const name = item.product.category?.name ?? "Uncategorized";
      const existing = byCategory.get(name) ?? { revenue: 0, unitsSold: 0 };
      existing.revenue += Number(item.lineTotal);
      existing.unitsSold += item.quantity;
      byCategory.set(name, existing);
    }

    return Array.from(byCategory.entries())
      .map(([name, v]) => ({ name, revenue: Number(v.revenue.toFixed(3)), unitsSold: v.unitsSold }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  static async getTopBrands(limit = 10) {
    const invoices = await prisma.brandInvoice.findMany({
      where: { status: "PAID" },
      select: { amount: true, brand: { select: { companyName: true } } },
    });

    const byBrand = new Map<string, number>();
    for (const inv of invoices) {
      byBrand.set(inv.brand.companyName, (byBrand.get(inv.brand.companyName) ?? 0) + Number(inv.amount));
    }

    return Array.from(byBrand.entries())
      .map(([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(3)) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  static async getSalesByHour(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
      select: { createdAt: true, total: true },
    });

    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, revenue: 0 }));
    for (const o of orders) {
      const hour = o.createdAt.getHours();
      byHour[hour].orders += 1;
      byHour[hour].revenue += Number(o.total);
    }
    return byHour.map((h) => ({ ...h, revenue: Number(h.revenue.toFixed(3)) }));
  }

  static async getSalesByRegion(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" }, address: { isNot: null } },
      select: { total: true, address: { select: { governorate: true } } },
    });

    const byRegion = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const region = o.address?.governorate ?? "Unknown";
      const existing = byRegion.get(region) ?? { orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += Number(o.total);
      byRegion.set(region, existing);
    }

    return Array.from(byRegion.entries())
      .map(([region, v]) => ({ region, orders: v.orders, revenue: Number(v.revenue.toFixed(3)) }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  static async getMonthlyComparison() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYearSameMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const [thisMonth, lastMonth, lastYear] = await Promise.all([
      prisma.businessMetricSnapshot.findUnique({ where: { granularity_periodStart: { granularity: "MONTHLY", periodStart: thisMonthStart } } }),
      prisma.businessMetricSnapshot.findUnique({ where: { granularity_periodStart: { granularity: "MONTHLY", periodStart: lastMonthStart } } }),
      prisma.businessMetricSnapshot.findUnique({ where: { granularity_periodStart: { granularity: "MONTHLY", periodStart: lastYearSameMonthStart } } }),
    ]);

    const pctChange = (curr?: number, prev?: number) => (prev && prev > 0 ? Number((((curr ?? 0) - prev) / prev * 100).toFixed(1)) : null);

    return {
      thisMonth,
      lastMonth,
      lastYear,
      momChange: pctChange(Number(thisMonth?.gmv ?? 0), Number(lastMonth?.gmv ?? 0)),
      yoyChange: pctChange(Number(thisMonth?.gmv ?? 0), Number(lastYear?.gmv ?? 0)),
    };
  }

  /**
   * Forecast — PLACEHOLDER LOGIC, not a real forecasting model. Simple
   * linear projection from the last N days of real daily GMV. Honestly
   * labeled as a naive trend projection, not machine-learned.
   */
  static async getForecast(daysAhead = 7) {
    const snapshots = await prisma.businessMetricSnapshot.findMany({
      where: { granularity: "DAILY" },
      orderBy: { periodStart: "desc" },
      take: 14,
    });
    if (snapshots.length < 2) return [];

    const values = snapshots.map((s) => Number(s.gmv)).reverse();
    const avgDailyChange = (values[values.length - 1] - values[0]) / (values.length - 1);
    const lastValue = values[values.length - 1];

    return Array.from({ length: daysAhead }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return { date: date.toISOString().slice(0, 10), projectedGMV: Number(Math.max(0, lastValue + avgDailyChange * (i + 1)).toFixed(3)) };
    });
  }
}
