import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * SupplierPerformanceService — Phase 7.8
 *
 * SCOPE NOTE: OrderIssue and ReturnRequest are attached to an Order,
 * not a SupplierOrder — in a multi-supplier order, a complaint/return
 * counts against every supplier with items in that order. Real
 * approximation of this schema's actual granularity, not a fabricated
 * precision. Every other KPI is exact.
 *
 * "Bonus visibility" is real: it adjusts Supplier.visibilityBoost,
 * which DiscoveryScoreEngine (Phase 5.6) folds into its existing
 * product ranking formula — not a second, parallel ranking system.
 */
export interface SupplierKPISet {
  acceptanceRate: number;
  cancellationRate: number;
  lateShipmentRate: number;
  avgRating: number;
  returnRate: number;
  complaintRate: number;
  inventoryAccuracy: number;
}

const WEIGHTS = {
  acceptanceRate: 0.20,
  cancellationRate: 0.15,
  lateShipmentRate: 0.15,
  avgRating: 0.20,
  returnRate: 0.10,
  complaintRate: 0.10,
  inventoryAccuracy: 0.10,
};

export class SupplierPerformanceService {
  static async computeKPIs(supplierId: string): Promise<SupplierKPISet> {
    const [statusEvents, deliveries, reviews, orders, stockCounts] = await Promise.all([
      prisma.supplierOrderStatusHistory.findMany({
        where: { supplierOrder: { supplierId } },
        select: { status: true, previousStatus: true },
      }),
      prisma.delivery.findMany({
        where: { supplierOrder: { supplierId }, deliveredAt: { not: null }, estimatedDeliveryAt: { not: null } },
        select: { deliveredAt: true, estimatedDeliveryAt: true },
      }),
      prisma.review.findMany({ where: { product: { supplierId }, status: "APPROVED" }, select: { rating: true } }),
      prisma.order.findMany({
        where: { supplierOrders: { some: { supplierId } } },
        select: { id: true, issues: { select: { id: true } }, returnRequests: { select: { id: true } } },
      }),
      prisma.stockCount.findMany({ where: { supplierId }, select: { systemQuantity: true, physicalQuantity: true } }),
    ]);

    const firstResponses = statusEvents.filter((e) => e.previousStatus === "PENDING" && (e.status === "ACCEPTED" || e.status === "CANCELLED"));
    const accepted = firstResponses.filter((e) => e.status === "ACCEPTED").length;
    const acceptanceRate = firstResponses.length > 0 ? (accepted / firstResponses.length) * 100 : 100;

    const totalOrders = orders.length;
    const cancelledCount = statusEvents.filter((e) => e.status === "CANCELLED").length;
    const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

    const lateCount = deliveries.filter((d) => d.deliveredAt! > d.estimatedDeliveryAt!).length;
    const lateShipmentRate = deliveries.length > 0 ? (lateCount / deliveries.length) * 100 : 0;

    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    const ordersWithReturns = orders.filter((o) => o.returnRequests.length > 0).length;
    const returnRate = totalOrders > 0 ? (ordersWithReturns / totalOrders) * 100 : 0;

    const ordersWithComplaints = orders.filter((o) => o.issues.length > 0).length;
    const complaintRate = totalOrders > 0 ? (ordersWithComplaints / totalOrders) * 100 : 0;

    const accuracySamples = stockCounts.map((c) => (c.systemQuantity > 0 ? 1 - Math.abs(c.systemQuantity - c.physicalQuantity) / c.systemQuantity : 1));
    const inventoryAccuracy = accuracySamples.length > 0 ? (accuracySamples.reduce((s, a) => s + Math.max(0, a), 0) / accuracySamples.length) * 100 : 100;

    return {
      acceptanceRate: Number(acceptanceRate.toFixed(1)),
      cancellationRate: Number(cancellationRate.toFixed(1)),
      lateShipmentRate: Number(lateShipmentRate.toFixed(1)),
      avgRating: Number(avgRating.toFixed(2)),
      returnRate: Number(returnRate.toFixed(1)),
      complaintRate: Number(complaintRate.toFixed(1)),
      inventoryAccuracy: Number(inventoryAccuracy.toFixed(1)),
    };
  }

  static computeCompositeScore(k: SupplierKPISet): number {
    const score =
      k.acceptanceRate * WEIGHTS.acceptanceRate +
      (100 - k.cancellationRate) * WEIGHTS.cancellationRate +
      (100 - k.lateShipmentRate) * WEIGHTS.lateShipmentRate +
      (k.avgRating / 5) * 100 * WEIGHTS.avgRating +
      (100 - k.returnRate) * WEIGHTS.returnRate +
      (100 - k.complaintRate) * WEIGHTS.complaintRate +
      k.inventoryAccuracy * WEIGHTS.inventoryAccuracy;
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  static assignBadge(score: number): "NONE" | "RISING" | "TRUSTED" | "TOP_RATED" | "ELITE" {
    if (score >= 90) return "ELITE";
    if (score >= 80) return "TOP_RATED";
    if (score >= 65) return "TRUSTED";
    if (score >= 50) return "RISING";
    return "NONE";
  }

  static async evaluateSupplier(supplierId: string) {
    const kpis = await this.computeKPIs(supplierId);
    const compositeScore = this.computeCompositeScore(kpis);
    const badge = this.assignBadge(compositeScore);

    let visibilityBoost = 0;
    let penaltyReason: string | null = null;
    let rewardReason: string | null = null;

    if (compositeScore >= 85) {
      visibilityBoost = 10;
      rewardReason = `Composite score ${compositeScore}/100 — top-tier performance, +10 visibility boost applied`;
    } else if (compositeScore >= 70) {
      visibilityBoost = 5;
      rewardReason = `Composite score ${compositeScore}/100 — strong performance, +5 visibility boost applied`;
    } else if (compositeScore < 40) {
      visibilityBoost = -10;
      penaltyReason = `Composite score ${compositeScore}/100 — below acceptable threshold, -10 visibility penalty applied. Flagged for admin review.`;
      logger.info("Supplier flagged for performance review", { supplierId, compositeScore, kpis });
    } else if (kpis.cancellationRate > 15) {
      visibilityBoost = -5;
      penaltyReason = `Cancellation rate ${kpis.cancellationRate}% exceeds 15% threshold — -5 visibility penalty applied`;
    }

    await prisma.supplier.update({ where: { id: supplierId }, data: { visibilityBoost } });

    await prisma.supplierPerformanceScore.upsert({
      where: { supplierId },
      create: { supplierId, ...kpis, compositeScore, badge, lastPenaltyReason: penaltyReason, lastRewardReason: rewardReason },
      update: { ...kpis, compositeScore, badge, lastPenaltyReason: penaltyReason, lastRewardReason: rewardReason, calculatedAt: new Date() },
    });

    return { kpis, compositeScore, badge, visibilityBoost, penaltyReason, rewardReason };
  }

  static async evaluateAll() {
    const suppliers = await prisma.supplier.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true } });
    let evaluated = 0;
    for (const s of suppliers) {
      await this.evaluateSupplier(s.id).catch((err) => logger.error("Supplier performance evaluation failed", err, { supplierId: s.id }));
      evaluated++;
    }
    return { evaluated };
  }

  static async getLeaderboard(limit = 50) {
    return prisma.supplierPerformanceScore.findMany({
      orderBy: { compositeScore: "desc" },
      take: limit,
      include: { supplier: { select: { companyName: true, visibilityBoost: true } } },
    });
  }
}
