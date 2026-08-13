import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DealOfTheHourService } from "@/lib/services/deal-of-the-hour-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  discountOverride: z.number().int().min(1).max(90).optional(),
  stockLimit: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const deal = await DealOfTheHourService.create({
    productId: body.productId,
    startTime: new Date(body.startTime),
    endTime: new Date(body.endTime),
    discountOverride: body.discountOverride,
    stockLimit: body.stockLimit,
  });

  logger.info("Deal of the Hour created", { dealId: deal.id, byUserId: session.user!.id });
  return NextResponse.json({ success: true, deal });
}
