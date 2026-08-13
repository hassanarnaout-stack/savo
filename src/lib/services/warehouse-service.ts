import { prisma } from "@/lib/prisma";

/**
 * WarehouseService — Phase 7.4
 *
 * Enforces the core invariant: Σ(ProductLocationStock.quantity for a
 * product) ≤ Product.stockQty. Put-away and transfers here NEVER touch
 * Product.stockQty — that number is still owned exclusively by
 * setStockQuantity/reserveStock/recordDamage in src/lib/inventory.ts.
 * This service only decides WHERE existing stock physically sits.
 */
export class InsufficientUnassignedStockError extends Error {
  constructor() {
    super("Not enough unassigned stock to put away that quantity.");
    this.name = "InsufficientUnassignedStockError";
  }
}

export class WarehouseService {
  static async createLocation(params: { code: string; zone: string; aisle?: string; shelf?: string; bin?: string }) {
    return prisma.warehouseLocation.create({ data: params });
  }

  static async getLocations() {
    return prisma.warehouseLocation.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
  }

  static async getUnassignedQuantity(productId: string): Promise<number> {
    const [product, assigned] = await Promise.all([
      prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { stockQty: true } }),
      prisma.productLocationStock.aggregate({ where: { productId }, _sum: { quantity: true } }),
    ]);
    return product.stockQty - (assigned._sum.quantity ?? 0);
  }

  static async putAway(params: { productId: string; locationId: string; quantity: number }) {
    if (params.quantity <= 0) throw new Error("Quantity must be positive.");
    const unassigned = await this.getUnassignedQuantity(params.productId);
    if (params.quantity > unassigned) throw new InsufficientUnassignedStockError();

    return prisma.productLocationStock.upsert({
      where: { productId_locationId: { productId: params.productId, locationId: params.locationId } },
      create: { productId: params.productId, locationId: params.locationId, quantity: params.quantity },
      update: { quantity: { increment: params.quantity } },
    });
  }

  static async transferStock(params: { productId: string; fromLocationId: string; toLocationId: string; quantity: number; userId: string; note?: string }) {
    if (params.quantity <= 0) throw new Error("Quantity must be positive.");

    const source = await prisma.productLocationStock.findUnique({
      where: { productId_locationId: { productId: params.productId, locationId: params.fromLocationId } },
    });
    if (!source || source.quantity < params.quantity) {
      throw new Error("Not enough stock at the source location for this transfer.");
    }

    return prisma.$transaction(async (tx) => {
      await tx.productLocationStock.update({
        where: { productId_locationId: { productId: params.productId, locationId: params.fromLocationId } },
        data: { quantity: { decrement: params.quantity } },
      });
      await tx.productLocationStock.upsert({
        where: { productId_locationId: { productId: params.productId, locationId: params.toLocationId } },
        create: { productId: params.productId, locationId: params.toLocationId, quantity: params.quantity },
        update: { quantity: { increment: params.quantity } },
      });
      return tx.stockTransfer.create({
        data: {
          productId: params.productId,
          fromLocationId: params.fromLocationId,
          toLocationId: params.toLocationId,
          quantity: params.quantity,
          note: params.note,
          createdByUserId: params.userId,
        },
      });
    });
  }

  static async getProductLocations(productId: string) {
    return prisma.productLocationStock.findMany({
      where: { productId, quantity: { gt: 0 } },
      include: { location: true },
      orderBy: { location: { code: "asc" } },
    });
  }
}
