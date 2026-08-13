import { prisma } from "@/lib/prisma";

/**
 * BICustomerAnalyticsService — Phase 7.1
 *
 * Every method here computes directly from real Order/AnalyticsEvent
 * data — no simulated distributions, no placeholder numbers.
 */
export class BICustomerAnalyticsService {
  static async getCustomerLTV(limit = 20) {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER", orders: { some: { status: { not: "CANCELLED" } } } },
      select: {
        id: true, name: true, email: true,
        orders: { where: { status: { not: "CANCELLED" } }, select: { total: true } },
      },
    });

    const withLTV = customers.map((c) => ({
      userId: c.id,
      name: c.name ?? c.email,
      ltv: c.orders.reduce((s, o) => s + Number(o.total), 0),
      orderCount: c.orders.length,
    }));

    const averageLTV = withLTV.length > 0 ? withLTV.reduce((s, c) => s + c.ltv, 0) / withLTV.length : 0;
    const topCustomers = withLTV.sort((a, b) => b.ltv - a.ltv).slice(0, limit);

    return { averageLTV: Number(averageLTV.toFixed(3)), topCustomers };
  }

  static async getRFMAnalysis() {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER", orders: { some: { status: { not: "CANCELLED" } } } },
      select: { id: true, name: true, email: true, orders: { where: { status: { not: "CANCELLED" } }, select: { total: true, createdAt: true } } },
    });

    const now = Date.now();
    const raw = customers.map((c) => {
      const lastOrder = c.orders.reduce((latest, o) => (o.createdAt > latest ? o.createdAt : latest), c.orders[0].createdAt);
      return {
        userId: c.id,
        name: c.name ?? c.email,
        recencyDays: Math.floor((now - lastOrder.getTime()) / (1000 * 60 * 60 * 24)),
        frequency: c.orders.length,
        monetary: c.orders.reduce((s, o) => s + Number(o.total), 0),
      };
    });

    const scoreByQuintile = (values: number[], value: number, invert = false) => {
      const sorted = [...values].sort((a, b) => a - b);
      const rank = sorted.findIndex((v) => v >= value);
      const percentile = rank / Math.max(1, sorted.length - 1);
      const score = Math.min(5, Math.max(1, Math.ceil(percentile * 5)));
      return invert ? 6 - score : score;
    };

    const recencyValues = raw.map((r) => r.recencyDays);
    const frequencyValues = raw.map((r) => r.frequency);
    const monetaryValues = raw.map((r) => r.monetary);

    return raw.map((r) => {
      const rScore = scoreByQuintile(recencyValues, r.recencyDays, true);
      const fScore = scoreByQuintile(frequencyValues, r.frequency);
      const mScore = scoreByQuintile(monetaryValues, r.monetary);
      const total = rScore + fScore + mScore;

      let segment = "At Risk";
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = "Champions";
      else if (rScore >= 4 && fScore >= 3) segment = "Loyal Customers";
      else if (rScore >= 4 && fScore <= 2) segment = "New Customers";
      else if (rScore <= 2 && fScore >= 4) segment = "At Risk (High Value)";
      else if (rScore <= 2 && fScore <= 2) segment = "Lost";

      return { ...r, rScore, fScore, mScore, rfmTotal: total, segment };
    }).sort((a, b) => b.rfmTotal - a.rfmTotal);
  }

  static async getCohortAnalysis(monthsBack = 6) {
    const orders = await prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const firstOrderMonth = new Map<string, string>();
    for (const o of orders) {
      const monthKey = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (!firstOrderMonth.has(o.userId)) firstOrderMonth.set(o.userId, monthKey);
    }

    const cohorts = new Map<string, { size: number; activeByOffset: Map<number, Set<string>> }>();
    for (const o of orders) {
      const cohortMonth = firstOrderMonth.get(o.userId)!;
      const [cy, cm] = cohortMonth.split("-").map(Number);
      const offset = (o.createdAt.getFullYear() - cy) * 12 + (o.createdAt.getMonth() + 1 - cm);
      if (offset < 0 || offset > monthsBack) continue;

      if (!cohorts.has(cohortMonth)) cohorts.set(cohortMonth, { size: 0, activeByOffset: new Map() });
      const cohort = cohorts.get(cohortMonth)!;
      if (!cohort.activeByOffset.has(offset)) cohort.activeByOffset.set(offset, new Set());
      cohort.activeByOffset.get(offset)!.add(o.userId);
    }

    for (const [, cohort] of cohorts) {
      cohort.size = cohort.activeByOffset.get(0)?.size ?? 0;
    }

    return Array.from(cohorts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-monthsBack)
      .map(([month, cohort]) => ({
        cohortMonth: month,
        size: cohort.size,
        retentionByMonth: Array.from({ length: monthsBack + 1 }, (_, offset) => {
          const active = cohort.activeByOffset.get(offset)?.size ?? 0;
          return cohort.size > 0 ? Number(((active / cohort.size) * 100).toFixed(1)) : 0;
        }),
      }));
  }

  static async getFunnelAnalysis(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [pageViews, productViews, addToCarts, checkoutStarts, orderCompletes] = await Promise.all([
      prisma.analyticsEvent.count({ where: { type: "PAGE_VIEW", createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: "PRODUCT_VIEW", createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: "ADD_TO_CART", createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: "CHECKOUT_START", createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: "ORDER_COMPLETE", createdAt: { gte: since } } }),
    ]);

    const steps = [
      { name: "Page Views", count: pageViews },
      { name: "Product Views", count: productViews },
      { name: "Add to Cart", count: addToCarts },
      { name: "Checkout Started", count: checkoutStarts },
      { name: "Order Completed", count: orderCompletes },
    ];

    return steps.map((step, i) => ({
      ...step,
      conversionFromPrevious: i === 0 || steps[i - 1].count === 0 ? 100 : Number(((step.count / steps[i - 1].count) * 100).toFixed(1)),
      conversionFromStart: steps[0].count === 0 ? 0 : Number(((step.count / steps[0].count) * 100).toFixed(1)),
    }));
  }
}
