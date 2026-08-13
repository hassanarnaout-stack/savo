import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { completeReservedStock, releaseReservedStock } from "@/lib/inventory";
import { AffiliateService } from "@/lib/services/affiliate-service";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "DELIVERED", "CANCELLED"]),
  note: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

const TERMINAL_SUPPLIER_STATUSES = ["DELIVERED", "CANCELLED"];

export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: body.status } });
    await tx.orderStatusHistory.create({
      data: { orderId: id, status: body.status, note: body.note, changedBy: session.user?.id },
    });

    // DELIVERED/CANCELLED cascade down to every non-terminal SupplierOrder
    // under this order, and trigger the matching inventory effect.
    //
    // NOTE: this is an intentional ADMIN OVERRIDE path — unlike the
    // supplier-facing endpoint (src/app/api/supplier/orders/[id]/status),
    // it does NOT enforce the strict PENDING->ACCEPTED->PREPARING->SHIPPED
    // ->DELIVERED sequence (see src/lib/supplier-orders.ts). Admins may
    // need to force-close an order regardless of what stage each
    // supplier's fulfillment is at. The inventory functions themselves
    // (completeReservedStock/releaseReservedStock) are identical in both
    // paths, so stock accounting stays correct either way.
    if (body.status === "DELIVERED" || body.status === "CANCELLED") {
      const supplierOrders = await tx.supplierOrder.findMany({
        where: { orderId: id, status: { notIn: TERMINAL_SUPPLIER_STATUSES as any } },
        include: { items: true },
      });

      for (const so of supplierOrders) {
        const newStatus = body.status === "DELIVERED" ? "DELIVERED" : "CANCELLED";

        await tx.supplierOrder.update({ where: { id: so.id }, data: { status: newStatus } });
        await tx.supplierOrderStatusHistory.create({
          data: {
            supplierOrderId: so.id,
            previousStatus: so.status,
            status: newStatus,
            changedBy: session.user?.id,
            note: `Cascaded from admin order status change: ${body.status}`,
          },
        });

        for (const item of so.items) {
          if (body.status === "DELIVERED") {
            await completeReservedStock(tx, {
              productId: item.productId,
              supplierId: so.supplierId,
              quantity: item.quantity,
              note: `Order ${id} delivered`,
            });
          } else {
            await releaseReservedStock(tx, {
              productId: item.productId,
              supplierId: so.supplierId,
              quantity: item.quantity,
              note: `Order ${id} cancelled`,
            });
          }
        }

        if (body.status === "CANCELLED") {
          await tx.supplierTransaction.updateMany({
            where: { supplierOrderId: so.id, status: { not: "REVERSED" } },
            data: { status: "REVERSED" },
          });
        } else if (body.status === "DELIVERED") {
          await tx.supplierTransaction.updateMany({
            where: { supplierOrderId: so.id, status: "PENDING" },
            data: { status: "COMPLETED" },
          });
        }
      }
    }
  });

  if (body.status === "DELIVERED") {
    await AffiliateService.confirmReferralOnDelivery(id);
  } else if (body.status === "CANCELLED") {
    await AffiliateService.voidReferral(id);
  }

  return NextResponse.json({ success: true });
}
