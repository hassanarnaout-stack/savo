import { prisma } from "@/lib/prisma";
import { transitionSupplierOrderStatus } from "@/lib/supplier-orders";

/**
 * PickingService — Phase 7.4
 *
 * Picking is a WAREHOUSE FULFILLMENT step, not a stock-quantity event —
 * stock was already reserved at checkout (reserveStock, existing code)
 * and finalized at delivery. Marking an item "picked" here only moves
 * its ProductLocationStock off the shelf (same decomposition table
 * WarehouseService uses) — never a second deduction from
 * Product.stockQty. Packing completion reuses the existing
 * transitionSupplierOrderStatus function, rather than a parallel
 * status system.
 */
export class PickingService {
  static async createPickList(supplierOrderId: string) {
    const supplierOrder = await prisma.supplierOrder.findUniqueOrThrow({
      where: { id: supplierOrderId },
      include: { items: true },
    });

    const items = await Promise.all(
      supplierOrder.items.map(async (item) => {
        const bestLocation = await prisma.productLocationStock.findFirst({
          where: { productId: item.productId, quantity: { gte: item.quantity } },
          orderBy: { quantity: "desc" },
        });
        return { productId: item.productId, locationId: bestLocation?.locationId, quantity: item.quantity };
      })
    );

    return prisma.pickList.create({
      data: { supplierOrderId, status: "PENDING", items: { create: items } },
      include: { items: true },
    });
  }

  static async pickItem(pickListItemId: string) {
    const item = await prisma.pickListItem.findUniqueOrThrow({ where: { id: pickListItemId } });
    if (item.isPicked) return item;

    return prisma.$transaction(async (tx) => {
      if (item.locationId) {
        await tx.productLocationStock.updateMany({
          where: { productId: item.productId, locationId: item.locationId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
      }
      const updated = await tx.pickListItem.update({ where: { id: pickListItemId }, data: { isPicked: true } });

      const pickList = await tx.pickList.findUniqueOrThrow({ where: { id: item.pickListId }, include: { items: true } });
      const allPicked = pickList.items.every((i) => i.id === pickListItemId || i.isPicked);
      if (allPicked && pickList.status !== "PICKED") {
        await tx.pickList.update({ where: { id: pickList.id }, data: { status: "PICKED" } });
      }

      return updated;
    });
  }

  static async packOrder(pickListId: string, userId: string) {
    const pickList = await prisma.pickList.findUniqueOrThrow({
      where: { id: pickListId },
      include: { items: true, supplierOrder: { select: { supplierId: true } } },
    });
    if (!pickList.items.every((i) => i.isPicked)) {
      throw new Error("Not all items have been picked yet.");
    }

    return prisma.$transaction(async (tx) => {
      await tx.pickList.update({ where: { id: pickListId }, data: { status: "PACKED", packedAt: new Date() } });
      await transitionSupplierOrderStatus(tx, {
        supplierOrderId: pickList.supplierOrderId,
        supplierId: pickList.supplierOrder.supplierId,
        newStatus: "PREPARING",
        userId,
      });
    });
  }

  static async getAll() {
    return prisma.pickList.findMany({
      where: { status: { not: "PACKED" } },
      orderBy: { createdAt: "asc" },
      include: {
        supplierOrder: { include: { order: { select: { orderNumber: true } }, supplier: { select: { companyName: true } } } },
        items: { include: { product: { select: { name: true } }, location: true } },
      },
      take: 50,
    });
  }
}
