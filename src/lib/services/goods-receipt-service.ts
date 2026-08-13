import { prisma } from "@/lib/prisma";
import { setStockQuantity } from "@/lib/inventory";
import { MarketingAutomationService } from "@/lib/services/marketing-automation-service";

/**
 * GoodsReceiptService — Phase 5.5.4
 *
 * Confirming a receipt is the ONLY place stock actually increases from
 * a supplier delivery — it reuses the existing setStockQuantity
 * (RESTOCK action), so every unit added here still gets a proper
 * InventoryHistory row exactly like every other stock mutation in this
 * codebase. A ProductBatch row is also created per item.
 */
export class GoodsReceiptService {
  static async create(params: {
    supplierId: string;
    items: { productId: string; quantity: number; costPrice: number; batchNumber?: string; expiryDate?: Date }[];
  }) {
    const referenceNumber = `GR-${Date.now().toString(36).toUpperCase()}`;
    return prisma.goodsReceipt.create({
      data: {
        supplierId: params.supplierId,
        referenceNumber,
        status: "PENDING",
        items: { create: params.items },
      },
      include: { items: true },
    });
  }

  static async markReceived(id: string, receivedByUserId: string) {
    return prisma.goodsReceipt.update({
      where: { id },
      data: { status: "RECEIVED", receivedByUserId, receivedAt: new Date() },
    });
  }

  /** VERIFIED — the moment inventory actually increases. Idempotent: refuses to double-apply. */
  static async confirmAndApplyToInventory(id: string, verifiedByUserId: string) {
    const receipt = await prisma.goodsReceipt.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (receipt.status === "VERIFIED") {
      throw new Error("This receipt has already been verified and applied to inventory.");
    }

    const restockedFromZero: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId }, select: { stockQty: true, supplierId: true } });
        if (product.stockQty === 0 && item.quantity > 0) restockedFromZero.push(item.productId);

        await setStockQuantity(tx, {
          productId: item.productId,
          supplierId: product.supplierId,
          newQuantity: product.stockQty + item.quantity,
          userId: verifiedByUserId,
          actionType: "RESTOCK",
          note: `Goods receipt ${receipt.referenceNumber}`,
        });

        if (item.batchNumber) {
          await tx.productBatch.create({
            data: {
              productId: item.productId,
              supplierId: product.supplierId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              quantity: item.quantity,
              remainingQuantity: item.quantity,
            },
          });
        }

        await tx.product.update({ where: { id: item.productId }, data: { purchaseCost: item.costPrice } });
      }

      await tx.goodsReceipt.update({ where: { id }, data: { status: "VERIFIED" } });
    });

    for (const productId of restockedFromZero) {
      MarketingAutomationService.checkProductRestock(productId).catch(() => {});
    }

    return prisma.goodsReceipt.findUniqueOrThrow({ where: { id }, include: { items: true } });
  }

  static async cancel(id: string) {
    return prisma.goodsReceipt.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  static async getAll(supplierId?: string) {
    return prisma.goodsReceipt.findMany({
      where: supplierId ? { supplierId } : {},
      orderBy: { createdAt: "desc" },
      include: { supplier: { select: { companyName: true } }, items: { include: { product: { select: { name: true } } } } },
    });
  }
}
