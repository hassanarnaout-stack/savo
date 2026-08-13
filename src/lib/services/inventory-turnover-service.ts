import { prisma } from "@/lib/prisma";

/**
 * InventoryTurnoverService — Phase 7.5
 *
 * Turnover = COGS over the period / average inventory value. This
 * schema doesn't track daily inventory-value snapshots, so CURRENT
 * inventory value (purchaseCost × stockQty, same formula already used
 * in /admin/inventory-reports) stands in for "average" — an honest,
 * standard simplification when point-in-time historical snapshots
 * aren't available, not a fabricated number.
 */
export interface ProductTurnover {
  productId: string;
  name: string;
  unitsSold: number;
  cogs: number;
  currentInventoryValue: number;
  turnoverRatio: number | null;
}

export class InventoryTurnoverService {
  static async analyze(days = 90) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [items, products] = await Promise.all([
      prisma.orderItem.findMany({
        where: { supplierOrder: { status: { not: "CANCELLED" }, order: { createdAt: { gte: since } } } },
        select: { quantity: true, productId: true },
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, stockQty: true, purchaseCost: true },
      }),
    ]);

    const unitsSoldByProduct = new Map<string, number>();
    for (const item of items) {
      unitsSoldByProduct.set(item.productId, (unitsSoldByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const results: ProductTurnover[] = products
      .filter((p) => p.purchaseCost !== null)
      .map((p) => {
        const unitsSold = unitsSoldByProduct.get(p.id) ?? 0;
        const cost = Number(p.purchaseCost);
        const cogs = unitsSold * cost;
        const currentInventoryValue = p.stockQty * cost;
        const turnoverRatio = currentInventoryValue > 0 ? Number((cogs / currentInventoryValue).toFixed(2)) : null;
        return { productId: p.id, name: p.name, unitsSold, cogs: Number(cogs.toFixed(3)), currentInventoryValue: Number(currentInventoryValue.toFixed(3)), turnoverRatio };
      })
      .filter((p) => p.unitsSold > 0 || p.currentInventoryValue > 0)
      .sort((a, b) => (b.turnoverRatio ?? 0) - (a.turnoverRatio ?? 0));

    const totalCogs = results.reduce((s, p) => s + p.cogs, 0);
    const totalInventoryValue = results.reduce((s, p) => s + p.currentInventoryValue, 0);
    const overallTurnover = totalInventoryValue > 0 ? Number((totalCogs / totalInventoryValue).toFixed(2)) : null;

    const slowMovers = results.filter((p) => p.unitsSold === 0 && p.currentInventoryValue > 0);

    return { products: results, overallTurnover, totalCogs: Number(totalCogs.toFixed(3)), totalInventoryValue: Number(totalInventoryValue.toFixed(3)), slowMovers, periodDays: days };
  }
}
