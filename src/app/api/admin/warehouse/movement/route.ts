import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { WarehouseService } from "@/lib/services/warehouse-service";
import { z } from "zod";

const putAwaySchema = z.object({ action: z.literal("PUT_AWAY"), productId: z.string(), locationId: z.string(), quantity: z.number().int().positive() });
const transferSchema = z.object({ action: z.literal("TRANSFER"), productId: z.string(), fromLocationId: z.string(), toLocationId: z.string(), quantity: z.number().int().positive(), note: z.string().optional() });
const schema = z.union([putAwaySchema, transferSchema]);

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  try {
    if (body.action === "PUT_AWAY") {
      const result = await WarehouseService.putAway(body);
      return NextResponse.json({ success: true, result });
    } else {
      const result = await WarehouseService.transferStock({ ...body, userId: session.user!.id! });
      return NextResponse.json({ success: true, result });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not process request" }, { status: 400 });
  }
}
