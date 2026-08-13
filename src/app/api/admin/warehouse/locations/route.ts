import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { WarehouseService } from "@/lib/services/warehouse-service";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1),
  zone: z.string().min(1),
  aisle: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const location = await WarehouseService.createLocation(body);
  return NextResponse.json({ success: true, location });
}
