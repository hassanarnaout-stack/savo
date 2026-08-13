import { prisma } from "@/lib/prisma";

/**
 * SponsoredROIService — Phase 7.7
 *
 * ROI = (attributed revenue - spend) / spend. "Attributed revenue" is
 * real: for each real click, checks whether that same user placed a
 * real order for the sponsored product within a 24h attribution
 * window. Simple last-click attribution, not a multi-touch model —
 * honest about that scope.
 */
export interface SlotROI {
  slotId: string;
  productName: string;
  placementType: string;
  spentTotal: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  attributedOrders: number;
  attributedRevenue: number;
  roi: number | null;
}

const ATTRIBUTION_WINDOW_HOURS = 24;

export class SponsoredROIService {
  static async getForBrand(brandId: string): Promise<SlotROI[]> {
    const slots = await prisma.sponsoredSlot.findMany({
      where: { brandId },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const results: SlotROI[] = [];
    for (const slot of slots) {
      const [impressions, clicks, clickEvents] = await Promise.all([
        prisma.brandEvent.count({ where: { eventType: "IMPRESSION", metadata: { path: ["slotId"], equals: slot.id } } }),
        prisma.brandEvent.count({ where: { eventType: "CLICK", metadata: { path: ["slotId"], equals: slot.id }, isFlaggedFraud: false } }),
        prisma.brandEvent.findMany({ where: { eventType: "CLICK", metadata: { path: ["slotId"], equals: slot.id }, isFlaggedFraud: false }, select: { userId: true, createdAt: true } }),
      ]);

      let attributedOrders = 0;
      let attributedRevenue = 0;
      const seenOrderIds = new Set<string>();

      for (const click of clickEvents) {
        if (!click.userId) continue;
        const windowEnd = new Date(click.createdAt.getTime() + ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000);
        const orderItem = await prisma.orderItem.findFirst({
          where: {
            productId: slot.productId,
            supplierOrder: { order: { userId: click.userId, createdAt: { gte: click.createdAt, lte: windowEnd } } },
          },
          select: { lineTotal: true, supplierOrder: { select: { orderId: true } } },
        });
        if (orderItem && !seenOrderIds.has(orderItem.supplierOrder.orderId)) {
          seenOrderIds.add(orderItem.supplierOrder.orderId);
          attributedOrders++;
          attributedRevenue += Number(orderItem.lineTotal);
        }
      }

      const spentTotal = Number(slot.spentTotal);
      const roi = spentTotal > 0 ? Number((((attributedRevenue - spentTotal) / spentTotal) * 100).toFixed(1)) : null;

      results.push({
        slotId: slot.id,
        productName: slot.product.name,
        placementType: slot.placementType,
        spentTotal: Number(spentTotal.toFixed(3)),
        impressions,
        clicks,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
        attributedOrders,
        attributedRevenue: Number(attributedRevenue.toFixed(3)),
        roi,
      });
    }

    return results;
  }
}
