import { prisma } from "@/lib/prisma";
import { GoodsReceiptService } from "@/lib/services/goods-receipt-service";

/**
 * PurchaseOrderService — Phase 7.4
 *
 * A PurchaseOrder is the REQUEST sent to a supplier — genuinely
 * distinct from GoodsReceipt (Phase 5.5), which records what actually
 * arrived. Converting a PO into a receipt reuses GoodsReceiptService
 * directly (which still owns all the real stock-increase logic) — this
 * service never touches Product.stockQty itself.
 */
export class PurchaseOrderService {
  static async create(params: {
    supplierId: string;
    expectedDate?: Date;
    createdByUserId: string;
    items: { productId: string; quantityOrdered: number; unitCost: number }[];
  }) {
    const referenceNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    return prisma.purchaseOrder.create({
      data: {
        supplierId: params.supplierId,
        referenceNumber,
        expectedDate: params.expectedDate,
        createdByUserId: params.createdByUserId,
        status: "DRAFT",
        items: { create: params.items },
      },
      include: { items: true },
    });
  }

  static async send(id: string) {
    return prisma.purchaseOrder.update({ where: { id }, data: { status: "SENT" } });
  }

  static async confirm(id: string) {
    return prisma.purchaseOrder.update({ where: { id }, data: { status: "CONFIRMED" } });
  }

  static async cancel(id: string) {
    return prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  static async receiveIntoGoodsReceipt(params: {
    purchaseOrderId: string;
    receivedItems: { productId: string; quantity: number; batchNumber?: string; expiryDate?: Date }[];
  }) {
    const po = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: params.purchaseOrderId },
      include: { items: true },
    });

    const costByProduct = new Map(po.items.map((i) => [i.productId, Number(i.unitCost)]));

    const receipt = await GoodsReceiptService.create({
      supplierId: po.supplierId,
      items: params.receivedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        costPrice: costByProduct.get(item.productId) ?? 0,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
      })),
    });

    const totalOrdered = po.items.reduce((s, i) => s + i.quantityOrdered, 0);
    const totalReceivedThisRound = params.receivedItems.reduce((s, i) => s + i.quantity, 0);
    const isFullyReceived = totalReceivedThisRound >= totalOrdered;

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: isFullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" },
    });

    return receipt;
  }

  static async getAll() {
    return prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { supplier: { select: { companyName: true } }, items: { include: { product: { select: { name: true } } } } },
      take: 50,
    });
  }
}
