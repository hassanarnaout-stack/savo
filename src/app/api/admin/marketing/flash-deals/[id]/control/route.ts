import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["START_NOW", "PAUSE", "RESUME", "STOP", "EXTEND"]),
  newEndAt: z.string().optional(), // required for EXTEND
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  let deal;
  switch (body.action) {
    case "START_NOW":
      deal = await FlashDealService.startNow(id);
      break;
    case "PAUSE":
      deal = await FlashDealService.pause(id);
      break;
    case "RESUME":
      deal = await FlashDealService.resume(id);
      break;
    case "STOP":
      deal = await FlashDealService.stop(id);
      break;
    case "EXTEND":
      if (!body.newEndAt) return NextResponse.json({ error: "newEndAt is required" }, { status: 400 });
      deal = await FlashDealService.extendTime(id, new Date(body.newEndAt));
      break;
  }

  return NextResponse.json({ success: true, deal });
}
