import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";
import { transitionSupplierOrderStatus, InvalidTransitionError, SupplierOrderOwnershipError, DeliveryNotCompleteError } from "@/lib/supplier-orders";
import { NotificationService } from "@/lib/notifications/service";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["ACCEPTED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  note: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  let updatedOrder;
  try {
    updatedOrder = await prisma.$transaction(async (tx) => {
      return transitionSupplierOrderStatus(tx, {
        supplierOrderId: id,
        supplierId: supplier.id, // <-- resolved from session, never from the client
        newStatus: body.status,
        userId: session.user.id,
        note: body.note,
      });
    });
  } catch (err) {
    if (err instanceof SupplierOrderOwnershipError) {
      // 404, not 403 — don't confirm to the caller that this id exists under another supplier
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (err instanceof InvalidTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof DeliveryNotCompleteError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not update order status" }, { status: 500 });
  }

  // Dispatched after the transaction has committed — notification delivery
  // is not part of the DB's atomicity guarantee.
  const order = await prisma.order.findUnique({ where: { id: updatedOrder.orderId }, select: { userId: true, orderNumber: true } });
  await NotificationService.dispatch({
    type: "SUPPLIER_ORDER_STATUS_CHANGED",
    recipientUserId: order?.userId,
    data: {
      supplierOrderNumber: updatedOrder.supplierOrderNumber,
      parentOrderNumber: order?.orderNumber,
      newStatus: body.status,
    },
  });

  // Phase 5 — the specific named lifecycle events, for a future
  // email/SMS/push channel to target individually rather than parsing
  // the generic event's `newStatus` field.
  const specificEventType =
    body.status === "ACCEPTED" ? "ORDER_ACCEPTED" : body.status === "SHIPPED" ? "ORDER_SHIPPED" : body.status === "DELIVERED" ? "ORDER_DELIVERED" : null;
  if (specificEventType && order) {
    await NotificationService.dispatch({
      type: specificEventType,
      recipientUserId: order.userId,
      data: { supplierOrderNumber: updatedOrder.supplierOrderNumber, parentOrderNumber: order.orderNumber },
    });
  }

  return NextResponse.json({ success: true, status: body.status });
}
