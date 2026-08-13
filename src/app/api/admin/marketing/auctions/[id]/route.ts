import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AuctionService } from "@/lib/services/auction-service";
import { z } from "zod";

const schema = z.object({ isEnabled: z.boolean() });

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
  const { isEnabled } = schema.parse(await req.json());
  const auction = await AuctionService.setEnabled(id, isEnabled);
  return NextResponse.json({ success: true, auction });
}
