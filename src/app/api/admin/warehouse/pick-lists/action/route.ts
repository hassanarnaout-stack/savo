import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { PickingService } from "@/lib/services/picking-service";
import { z } from "zod";

const pickSchema = z.object({ action: z.literal("PICK_ITEM"), pickListItemId: z.string() });
const packSchema = z.object({ action: z.literal("PACK"), pickListId: z.string() });
const schema = z.union([pickSchema, packSchema]);

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  try {
    if (body.action === "PICK_ITEM") {
      const item = await PickingService.pickItem(body.pickListItemId);
      return NextResponse.json({ success: true, item });
    } else {
      await PickingService.packOrder(body.pickListId, session.user!.id!);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not process request" }, { status: 400 });
  }
}
