import { prisma } from "@/lib/prisma";

/**
 * ProductSignalsService — Phase 5.6 §8
 *
 * "Appear only when the data is genuinely true" — every signal is a
 * real query result; the rendering component hides a signal whose
 * value is null/zero. No fabricated numbers.
 */
export interface LiveSignals {
  viewersNow: number | null;
  soldToday: number;
  stockRemaining: number;
  offerEndingSoon: { endsAt: Date; label: string } | null;
}

export class ProductSignalsService {
  static async getSignals(productId: string): Promise<LiveSignals> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [recentViews, todaysOrders, product, liveFlashDeal] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["sessionId"],
        where: { type: "PRODUCT_VIEW", productId, createdAt: { gte: tenMinutesAgo } },
      }),
      prisma.orderItem.count({
        where: { productId, supplierOrder: { order: { createdAt: { gte: startOfToday } } } },
      }),
      prisma.product.findUnique({ where: { id: productId }, select: { stockQty: true, lowStockAlert: true } }),
      prisma.flashDeal.findFirst({
        where: { productId, status: "LIVE", startAt: { lte: new Date() }, endAt: { gt: new Date() } },
        select: { endAt: true },
      }),
    ]);

    return {
      viewersNow: recentViews.length >= 2 ? recentViews.length : null,
      soldToday: todaysOrders,
      stockRemaining: product?.stockQty ?? 0,
      offerEndingSoon: liveFlashDeal ? { endsAt: liveFlashDeal.endAt, label: "Offer ends soon" } : null,
    };
  }
}
