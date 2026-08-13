import type { Prisma, SupplierOrderStatus } from "@prisma/client";
import { completeReservedStock, releaseReservedStock } from "@/lib/inventory";
import { SupplierLedgerService } from "@/lib/services/supplier-ledger-service";

type Tx = Prisma.TransactionClient;

/**
 * The ONLY allowed transitions. Anything not listed here is rejected.
 *   PENDING -> ACCEPTED -> PREPARING -> SHIPPED -> DELIVERED
 *   PENDING -> CANCELLED
 * Once ACCEPTED, an order can only move forward to DELIVERED — it cannot
 * be cancelled mid-fulfillment (per the business rule as specified).
 * DELIVERED and CANCELLED are terminal.
 */
const VALID_TRANSITIONS: Record<SupplierOrderStatus, SupplierOrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING"],
  PREPARING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition SupplierOrder from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export class SupplierOrderOwnershipError extends Error {
  constructor() {
    super("This SupplierOrder does not belong to the current supplier");
    this.name = "SupplierOrderOwnershipError";
  }
}

/**
 * Phase 5.4 — thrown when a supplier tries to mark an order DELIVERED
 * while a linked Delivery record exists but hasn't itself reached
 * DELIVERED status yet (i.e. a delivery partner is handling this order
 * and hasn't confirmed drop-off). Orders with NO Delivery record at all
 * are unaffected — that's the pre-Phase-5.4 self-fulfilled path and
 * stays exactly as it worked before.
 */
export class DeliveryNotCompleteError extends Error {
  constructor() {
    super("This order has a delivery partner assigned — it can only be marked DELIVERED once the delivery is confirmed complete.");
    this.name = "DeliveryNotCompleteError";
  }
}

export function isValidTransition(from: SupplierOrderStatus, to: SupplierOrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Used by the UI to render only the status buttons that are actually legal right now. */
export function getValidNextStatuses(current: SupplierOrderStatus): SupplierOrderStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

interface TransitionParams {
  supplierOrderId: string;
  supplierId: string; // resolved from session server-side by the caller — never trust a client-supplied id here
  newStatus: SupplierOrderStatus;
  userId?: string | null;
  note?: string;
}

/**
 * Applies a validated status transition to a SupplierOrder, inside the
 * transaction the caller provides. In one atomic operation this:
 *   1. Verifies the SupplierOrder belongs to `supplierId` (SECURITY)
 *   2. Verifies the transition is allowed (no arbitrary status jumps)
 *   3. Updates SupplierOrder.status
 *   4. Writes a SupplierOrderStatusHistory row (previous + new + who + when)
 *   5. On DELIVERED: deducts stock via completeReservedStock for every item
 *   6. On CANCELLED: releases the reservation via releaseReservedStock
 *
 * Does NOT dispatch notifications — the caller should do that after the
 * transaction commits (see the API route for the pattern).
 */
export async function transitionSupplierOrderStatus(tx: Tx, params: TransitionParams) {
  const supplierOrder = await tx.supplierOrder.findUniqueOrThrow({
    where: { id: params.supplierOrderId },
    include: { items: true, delivery: true },
  });

  if (supplierOrder.supplierId !== params.supplierId) {
    throw new SupplierOrderOwnershipError();
  }

  // Phase 5.4 — if a delivery partner is assigned, the handoff must be
  // confirmed complete before the order itself can be marked DELIVERED.
  // Orders with no Delivery record (self-fulfilled, pre-5.4 behavior)
  // skip this check entirely.
  if (params.newStatus === "DELIVERED" && supplierOrder.delivery && supplierOrder.delivery.status !== "DELIVERED") {
    throw new DeliveryNotCompleteError();
  }

  if (!isValidTransition(supplierOrder.status, params.newStatus)) {
    throw new InvalidTransitionError(supplierOrder.status, params.newStatus);
  }

  await tx.supplierOrder.update({
    where: { id: params.supplierOrderId },
    data: { status: params.newStatus },
  });

  await tx.supplierOrderStatusHistory.create({
    data: {
      supplierOrderId: params.supplierOrderId,
      previousStatus: supplierOrder.status,
      status: params.newStatus,
      changedBy: params.userId ?? null,
      note: params.note,
    },
  });

  if (params.newStatus === "DELIVERED") {
    for (const item of supplierOrder.items) {
      await completeReservedStock(tx, {
        productId: item.productId,
        supplierId: params.supplierId,
        quantity: item.quantity,
        userId: params.userId,
        note: `SupplierOrder ${supplierOrder.supplierOrderNumber ?? supplierOrder.id} delivered`,
      });
    }
    // The sale is now REALIZED — this is the single moment a
    // SupplierTransaction moves from "counts toward GMV only" to
    // "counts toward Realized Sales / Supplier Earnings / Commission".
    // See src/lib/supplier-analytics.ts for how the two are kept separate.
    await tx.supplierTransaction.updateMany({
      where: { supplierOrderId: params.supplierOrderId, status: "PENDING" },
      data: { status: "COMPLETED" },
    });

    // Phase 5.5 — mirror the same realization event into the general
    // ledger (SALE credit + COMMISSION debit), so the Finance Center's
    // Payables figure is always in sync with Realized Sales.
    await SupplierLedgerService.recordSale(tx, {
      supplierId: params.supplierId,
      supplierOrderId: params.supplierOrderId,
      saleAmount: Number(supplierOrder.subtotal),
      commissionAmount: Number(supplierOrder.commissionAmount),
    });

    // Phase 6.1 — mark the order's payment PAID once every SupplierOrder
    // under it has been delivered (a customer Order can span several
    // suppliers; COD is collected once for the whole order, so we only
    // consider it truly paid when the last piece arrives).
    const siblingOrders = await tx.supplierOrder.findMany({
      where: { orderId: supplierOrder.orderId },
      select: { status: true },
    });
    const allDelivered = siblingOrders.every((so) => so.status === "DELIVERED");
    if (allDelivered) {
      const { PaymentService } = await import("@/lib/services/payment-service");
      await PaymentService.markPaidOnDelivery(supplierOrder.orderId);
    }
  } else if (params.newStatus === "CANCELLED") {
    for (const item of supplierOrder.items) {
      await releaseReservedStock(tx, {
        productId: item.productId,
        supplierId: params.supplierId,
        quantity: item.quantity,
        userId: params.userId,
        note: `SupplierOrder ${supplierOrder.supplierOrderNumber ?? supplierOrder.id} cancelled`,
      });
    }
    // The sale never actually happened — reverse its commission-tracking
    // transaction so it stops counting toward Gross Sales / Commission
    // Pending in the supplier's financial dashboard (Phase 3.4).
    await tx.supplierTransaction.updateMany({
      where: { supplierOrderId: params.supplierOrderId, status: { not: "REVERSED" } },
      data: { status: "REVERSED" },
    });
  }

  return supplierOrder;
}
