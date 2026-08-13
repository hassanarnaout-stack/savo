import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AuctionService } from "@/lib/services/auction-service";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  startingPrice: z.number().positive(),
  minIncrement: z.number().positive(),
  startTime: z.string(),
  endTime: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const auction = await AuctionService.create({
    productId: body.productId,
    startingPrice: body.startingPrice,
    minIncrement: body.minIncrement,
    startTime: new Date(body.startTime),
    endTime: new Date(body.endTime),
  });

  return NextResponse.json({ success: true, auction });
}
