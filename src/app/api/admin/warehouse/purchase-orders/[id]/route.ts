import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { PurchaseOrderService } from "@/lib/services/purchase-order-service";
import { z } from "zod";

const statusSchema = z.object({ action: z.enum(["SEND", "CONFIRM", "CANCEL"]) });
const receiveSchema = z.object({
  action: z.literal("RECEIVE"),
  receivedItems: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive(), batchNumber: z.string().optional(), expiryDate: z.string().optional() })).min(1),
});
const schema = z.union([statusSchema, receiveSchema]);

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  try {
    if (body.action === "SEND") {
      const po = await PurchaseOrderService.send(id);
      return NextResponse.json({ success: true, purchaseOrder: po });
    }
    if (body.action === "CONFIRM") {
      const po = await PurchaseOrderService.confirm(id);
      return NextResponse.json({ success: true, purchaseOrder: po });
    }
    if (body.action === "CANCEL") {
      const po = await PurchaseOrderService.cancel(id);
      return NextResponse.json({ success: true, purchaseOrder: po });
    }
    if (body.action === "RECEIVE") {
      const receipt = await PurchaseOrderService.receiveIntoGoodsReceipt({
        purchaseOrderId: id,
        receivedItems: body.receivedItems.map((i) => ({ ...i, expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined })),
      });
      return NextResponse.json({ success: true, receipt });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not process request" }, { status: 400 });
  }
}
