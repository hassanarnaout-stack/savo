import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean() });

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
  const { isActive } = schema.parse(await req.json());
  const deal = await FlashDealService.setActive(id, isActive);
  return NextResponse.json({ success: true, deal });
}
