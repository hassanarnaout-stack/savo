import { prisma } from "@/lib/prisma";
import { reserveStock } from "@/lib/inventory";
import { generateOrderNumber, generateSupplierOrderNumber } from "@/lib/utils";

/**
 * SubscriptionService — Phase 6.6
 *
 * processDueSubscriptions() creates a REAL Order (with its own
 * SupplierOrder, proper stock reservation, and the subscription's
 * discount applied) for every subscription whose nextDeliveryDate has
 * arrived. Written to be called by a scheduled job; this Next.js app
 * has no built-in cron, so for now it's also safely triggerable
 * on-demand via an admin action (see the API route).
 */
const FREQUENCY_DAYS: Record<string, number> = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 };

export class NoDefaultAddressError extends Error {
  constructor() {
    super("This customer has no default delivery address — cannot generate a subscription order yet.");
    this.name = "NoDefaultAddressError";
  }
}

export class SubscriptionService {
  static async create(params: { userId: string; productId: string; quantity: number; frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY"; discountPercent?: number }) {
    const nextDeliveryDate = new Date();
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + FREQUENCY_DAYS[params.frequency]);

    return prisma.productSubscription.create({
      data: {
        userId: params.userId,
        productId: params.productId,
        quantity: params.quantity,
        frequency: params.frequency,
        discountPercent: params.discountPercent ?? 10,
        nextDeliveryDate,
        status: "ACTIVE",
      },
    });
  }

  static async pause(id: string) {
    return prisma.productSubscription.update({ where: { id }, data: { status: "PAUSED" } });
  }

  static async resume(id: string) {
    return prisma.productSubscription.update({ where: { id }, data: { status: "ACTIVE" } });
  }

  static async cancel(id: string) {
    return prisma.productSubscription.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  static async getForUser(userId: string) {
    return prisma.productSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, brandName: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
    });
  }

  /** Generates a real order for one due subscription. Returns null (never throws) if out of stock — stays due, retried next run. Throws NoDefaultAddressError if the customer has no default address saved. */
  static async processOne(subscriptionId: string) {
    const sub = await prisma.productSubscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { product: { include: { supplier: { select: { id: true, commissionRate: true } } } } },
    });

    if (sub.status !== "ACTIVE" || sub.nextDeliveryDate > new Date()) return null;
    if (sub.product.stockQty < sub.quantity) return null;

    const defaultAddress = await prisma.address.findFirst({ where: { userId: sub.userId, isDefault: true } });
    if (!defaultAddress) throw new NoDefaultAddressError();

    const unitPrice = Number(sub.product.saveoPrice) * (1 - sub.discountPercent / 100);
    const lineTotal = Number((unitPrice * sub.quantity).toFixed(3));
    const commissionAmount = Number(((lineTotal * Number(sub.product.supplier.commissionRate)) / 100).toFixed(3));

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: sub.userId,
          addressId: defaultAddress.id,
          status: "PENDING",
          paymentMethod: "COD",
          subtotal: lineTotal,
          total: lineTotal,
        },
      });

      await tx.supplierOrder.create({
        data: {
          orderId: newOrder.id,
          supplierId: sub.product.supplier.id,
          supplierOrderNumber: generateSupplierOrderNumber(),
          status: "PENDING",
          subtotal: lineTotal,
          commissionRate: sub.product.supplier.commissionRate,
          commissionAmount,
          supplierPayout: Number((lineTotal - commissionAmount).toFixed(3)),
          items: {
            create: [{
              productId: sub.productId,
              productName: sub.product.name,
              unitPrice,
              originalPrice: Number(sub.product.saveoPrice),
              quantity: sub.quantity,
              lineTotal,
            }],
          },
        },
      });

      await reserveStock(tx, {
        productId: sub.productId,
        supplierId: sub.product.supplier.id,
        quantity: sub.quantity,
        userId: sub.userId,
        note: `Subscribe & Save order ${newOrder.orderNumber}`,
      });

      await tx.subscriptionOrder.create({ data: { subscriptionId: sub.id, orderId: newOrder.id } });

      const nextDeliveryDate = new Date();
      nextDeliveryDate.setDate(nextDeliveryDate.getDate() + FREQUENCY_DAYS[sub.frequency]);
      await tx.productSubscription.update({ where: { id: sub.id }, data: { nextDeliveryDate } });

      return newOrder;
    });

    return order;
  }

  /** Processes every subscription whose nextDeliveryDate has arrived. */
  static async processDueSubscriptions() {
    const due = await prisma.productSubscription.findMany({
      where: { status: "ACTIVE", nextDeliveryDate: { lte: new Date() } },
      select: { id: true },
    });

    let processed = 0;
    let skipped = 0;
    for (const sub of due) {
      try {
        const result = await this.processOne(sub.id);
        if (result) processed++;
        else skipped++;
      } catch {
        skipped++;
      }
    }
    return { checked: due.length, processed, skipped };
  }
}
