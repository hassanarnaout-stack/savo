import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { GoodsReceiptService } from "@/lib/services/goods-receipt-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ action: z.enum(["RECEIVE", "VERIFY", "CANCEL"]) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = schema.parse(await req.json());

  try {
    let receipt;
    if (action === "RECEIVE") receipt = await GoodsReceiptService.markReceived(id, session.user!.id!);
    else if (action === "VERIFY") receipt = await GoodsReceiptService.confirmAndApplyToInventory(id, session.user!.id!);
    else receipt = await GoodsReceiptService.cancel(id);

    logger.info("Goods receipt status changed", { receiptId: id, action, byUserId: session.user!.id });
    return NextResponse.json({ success: true, receipt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not update receipt" }, { status: 400 });
  }
}
