import { prisma } from "@/lib/prisma";

/**
 * BusinessAlertService — Phase 7.2
 *
 * Every alert here is a real threshold check against real data. No
 * alert fires unless its underlying condition is genuinely true.
 */
export interface BusinessAlert {
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
}

export class BusinessAlertService {
  static async getAlerts(): Promise<BusinessAlert[]> {
    const alerts: BusinessAlert[] = [];
    const now = new Date();
    const thisWeekStart = new Date(now); thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(now); lastWeekStart.setDate(lastWeekStart.getDate() - 14);

    const [thisWeek, lastWeek] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: thisWeekStart }, status: { not: "CANCELLED" } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: lastWeekStart, lt: thisWeekStart }, status: { not: "CANCELLED" } }, _sum: { total: true } }),
    ]);
    const thisWeekTotal = Number(thisWeek._sum.total ?? 0);
    const lastWeekTotal = Number(lastWeek._sum.total ?? 0);
    if (lastWeekTotal > 0) {
      const change = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
      if (change <= -20) {
        alerts.push({ severity: "HIGH", title: "Sales dropped sharply", detail: `GMV is down ${Math.abs(change).toFixed(1)}% vs last week (${thisWeekTotal.toFixed(3)} KD vs ${lastWeekTotal.toFixed(3)} KD).` });
      }
    }

    const outOfStockWithDemand = await prisma.product.count({
      where: { status: "ACTIVE", stockQty: 0, orderCount: { gt: 0 } },
    });
    if (outOfStockWithDemand > 0) {
      alerts.push({ severity: "MEDIUM", title: "Products out of stock with real demand", detail: `${outOfStockWithDemand} product(s) with completed order history are currently at zero stock.` });
    }

    const threeDaysAgo = new Date(now); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const staleReturns = await prisma.returnRequest.count({ where: { status: "REQUESTED", createdAt: { lt: threeDaysAgo } } });
    if (staleReturns > 0) {
      alerts.push({ severity: "MEDIUM", title: "Return requests awaiting review", detail: `${staleReturns} return request(s) have been pending for more than 3 days.` });
    }

    const pendingPayouts = await prisma.supplierPayout.count({ where: { status: "PENDING" } });
    if (pendingPayouts > 0) {
      alerts.push({ severity: "LOW", title: "Supplier payouts awaiting approval", detail: `${pendingPayouts} supplier payout request(s) are waiting for admin approval.` });
    }

    const in7Days = new Date(now); in7Days.setDate(in7Days.getDate() + 7);
    const expiringSoon = await prisma.product.count({ where: { status: "ACTIVE", expiryDate: { gte: now, lt: in7Days }, stockQty: { gt: 0 } } });
    if (expiringSoon > 0) {
      alerts.push({ severity: "HIGH", title: "Products expiring within 7 days", detail: `${expiringSoon} product(s) with remaining stock expire within a week — consider an urgent flash deal.` });
    }

    return alerts;
  }
}
