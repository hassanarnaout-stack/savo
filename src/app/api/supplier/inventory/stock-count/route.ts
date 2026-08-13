import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedSupplier } from "@/lib/auth";
import { StockCountService } from "@/lib/services/stock-count-service";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  physicalQuantity: z.number().int().min(0),
  method: z.enum(["MANUAL", "BARCODE"]).default("MANUAL"),
});

export async function POST(req: NextRequest) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  try {
    const count = await StockCountService.recordCount({
      productId: body.productId,
      supplierId: supplier.id,
      physicalQuantity: body.physicalQuantity,
      method: body.method,
      countedByUserId: session.user!.id!,
    });
    return NextResponse.json({ success: true, count });
  } catch {
    return NextResponse.json({ error: "Could not record stock count" }, { status: 400 });
  }
}
