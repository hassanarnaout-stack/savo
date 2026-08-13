import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { PickingService } from "@/lib/services/picking-service";
import { z } from "zod";

const schema = z.object({ supplierOrderId: z.string() });

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { supplierOrderId } = schema.parse(await req.json());
  const pickList = await PickingService.createPickList(supplierOrderId);
  return NextResponse.json({ success: true, pickList });
}
