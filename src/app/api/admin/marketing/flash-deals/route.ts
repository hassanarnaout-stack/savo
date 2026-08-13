import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  discountPercent: z.number().int().min(1).max(90),
  startAt: z.string(),
  endAt: z.string(),
  stockLimit: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const deal = await FlashDealService.create({
    productId: body.productId,
    discountPercent: body.discountPercent,
    startAt: new Date(body.startAt),
    endAt: new Date(body.endAt),
    stockLimit: body.stockLimit,
  });

  return NextResponse.json({ success: true, deal });
}
