import { prisma } from "@/lib/prisma";

/**
 * DiscoveryScoreEngine — Phase 5.6 §9
 *
 * Computes a real 0-100 score from genuine signals already tracked
 * elsewhere in this codebase — not a random/fake number:
 *   - Rating (Review.rating average)
 *   - Sales (orderCount)
 *   - Scarcity (stock relative to its own lowStockAlert threshold)
 *   - Sell-through velocity (soldQuantity per day since listing)
 *   - Active deals (a live FlashDeal gives a bonus)
 *
 * Meant to run on a schedule (cron) via recomputeAll(), but is also
 * safe to call for a single product on demand.
 */
export class DiscoveryScoreEngine {
  static async computeForProduct(productId: string): Promise<number> {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: {
        orderCount: true,
        soldQuantity: true,
        stockQty: true,
        lowStockAlert: true,
        createdAt: true,
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        supplier: { select: { visibilityBoost: true } }, // Phase 7.8 — real automatic reward/penalty from SupplierPerformanceService
      },
    });

    const avgRating = product.reviews.length > 0 ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : 0;
    const ratingScore = (avgRating / 5) * 25;

    const salesScore = Math.min(25, Math.log2(product.orderCount + 1) * 5);

    const scarcityRatio = product.lowStockAlert > 0 ? product.stockQty / product.lowStockAlert : 2;
    const scarcityScore = scarcityRatio <= 1 ? 20 : scarcityRatio <= 2 ? 10 : 0;

    const daysListed = Math.max(1, Math.floor((Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const velocity = product.soldQuantity / daysListed;
    const velocityScore = Math.min(20, velocity * 10);

    const hasLiveDeal = await prisma.flashDeal.count({
      where: { productId, status: "LIVE", startAt: { lte: new Date() }, endAt: { gt: new Date() } },
    });
    const dealScore = hasLiveDeal > 0 ? 10 : 0;

    const total = ratingScore + salesScore + scarcityScore + velocityScore + dealScore + product.supplier.visibilityBoost;
    return Math.round(Math.max(0, Math.min(100, total)));
  }

  static async recomputeAndSave(productId: string): Promise<number> {
    const score = await this.computeForProduct(productId);
    await prisma.product.update({ where: { id: productId }, data: { discoveryScore: score } });
    return score;
  }

  static async recomputeAll(): Promise<{ updated: number }> {
    const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    let updated = 0;
    for (const p of products) {
      await this.recomputeAndSave(p.id);
      updated++;
    }
    return { updated };
  }
}
