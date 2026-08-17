import { prisma } from "@/lib/prisma";

/**
 * DealOfTheHourService — fills a real gap: this model already existed
 * and was already displayed on the homepage (getDealOfTheHour in
 * discovery-engine.ts), but had zero admin UI to actually create or
 * manage one. Deactivating any currently-active slot when creating a
 * new one keeps the "single rotating spotlight" behavior genuine.
 */
export class DealOfTheHourService {
  static async create(params: {
    productId: string;
    startTime: Date;
    endTime: Date;
    discountOverride?: number;
    stockLimit: number;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.dealOfTheHour.updateMany({ where: { isActive: true }, data: { isActive: false } });
      return tx.dealOfTheHour.create({ data: { ...params, isActive: true } });
    });
  }

  static async deactivate(id: string) {
    return prisma.dealOfTheHour.update({ where: { id }, data: { isActive: false } });
  }

  static async getAll(limit = 20) {
    return prisma.dealOfTheHour.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { product: { select: { name: true, saveoPrice: true } } },
    });
  }

  /** Called from checkout when an order includes a product with the
   * currently active SAVO Hour deal — see
   * src/app/api/checkout/route.ts. Same atomic conditional-update
   * pattern as FlashDealService.recordSaleIfRoom: the guard
   * (`buyersCount <= stockLimit - quantity`) is evaluated by Postgres
   * against the row's live state inside the checkout transaction, so
   * concurrent checkouts racing for the last units can never both
   * succeed past stockLimit. `buyersCount` is treated as CLAIMED UNITS
   * (matching the existing "Only X left" / "Claimed X%" UI formulas in
   * savo-hour.tsx) — quantity is added in full, not once per order.
   * Returns false if there isn't room for the full quantity — the
   * caller must roll back the whole checkout transaction. */
  static async claimUnits(tx: any, dealId: string, quantity: number): Promise<boolean> {
    const deal = await tx.dealOfTheHour.findUnique({ where: { id: dealId }, select: { stockLimit: true } });
    if (!deal) return false;
    const result = await tx.dealOfTheHour.updateMany({
      where: { id: dealId, buyersCount: { lte: deal.stockLimit - quantity } },
      data: { buyersCount: { increment: quantity } },
    });
    return result.count > 0;
  }

  /** Symmetric release for a verified-safe cancellation transition —
   * see src/app/api/admin/orders/[id]/status/route.ts. Guarded against
   * a double-release pushing buyersCount negative. */
  static async releaseUnits(tx: any, dealId: string, quantity: number): Promise<void> {
    await tx.dealOfTheHour.updateMany({
      where: { id: dealId, buyersCount: { gte: quantity } },
      data: { buyersCount: { decrement: quantity } },
    });
  }
}
