import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { GoodsReceiptService } from "@/lib/services/goods-receipt-service";
import { z } from "zod";

const schema = z.object({
  supplierId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    costPrice: z.number().positive(),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  })).min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const receipt = await GoodsReceiptService.create({
    supplierId: body.supplierId,
    items: body.items.map((i) => ({ ...i, expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined })),
  });

  return NextResponse.json({ success: true, receipt });
}
