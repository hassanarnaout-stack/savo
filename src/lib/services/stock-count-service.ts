import { prisma } from "@/lib/prisma";
import { setStockQuantity } from "@/lib/inventory";

/**
 * StockCountService — Phase 5.5.8
 *
 * Records a physical count against the system's current count, then
 * generates a real adjustment (via the existing setStockQuantity /
 * MANUAL_UPDATE path) so the system quantity is corrected — with a
 * proper InventoryHistory row, same as every other stock mutation here.
 */
export class StockCountService {
  static async recordCount(params: {
    productId: string;
    supplierId: string;
    physicalQuantity: number;
    method: "MANUAL" | "BARCODE";
    countedByUserId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id: params.productId }, select: { stockQty: true, supplierId: true } });

      if (product.supplierId !== params.supplierId) {
        throw new Error("STOCK_COUNT_SUPPLIER_MISMATCH");
      }

      const count = await tx.stockCount.create({
        data: {
          productId: params.productId,
          supplierId: params.supplierId,
          systemQuantity: product.stockQty,
          physicalQuantity: params.physicalQuantity,
          method: params.method,
          countedByUserId: params.countedByUserId,
        },
      });

      if (params.physicalQuantity !== product.stockQty) {
        await setStockQuantity(tx, {
          productId: params.productId,
          supplierId: params.supplierId,
          newQuantity: params.physicalQuantity,
          userId: params.countedByUserId,
          actionType: "MANUAL_UPDATE",
          note: `Stock count adjustment (${params.method}) — system said ${product.stockQty}, counted ${params.physicalQuantity}`,
        });
      }

      return count;
    });
  }

  static async getHistory(supplierId?: string) {
    return prisma.stockCount.findMany({
      where: supplierId ? { supplierId } : {},
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } },
      take: 100,
    });
  }
}
