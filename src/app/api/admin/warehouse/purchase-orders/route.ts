import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { PurchaseOrderService } from "@/lib/services/purchase-order-service";
import { z } from "zod";

const schema = z.object({
  supplierId: z.string(),
  expectedDate: z.string().optional(),
  items: z.array(z.object({ productId: z.string(), quantityOrdered: z.number().int().positive(), unitCost: z.number().positive() })).min(1),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const po = await PurchaseOrderService.create({
    supplierId: body.supplierId,
    expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
    createdByUserId: session.user!.id!,
    items: body.items,
  });

  return NextResponse.json({ success: true, purchaseOrder: po });
}
