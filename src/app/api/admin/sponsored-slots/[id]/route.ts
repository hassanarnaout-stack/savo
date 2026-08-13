import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { SponsoredSlotService } from "@/lib/services/sponsored-slot-service";
import { z } from "zod";

const schema = z.object({ action: z.enum(["APPROVE", "REJECT"]) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = schema.parse(await req.json());

  const slot = action === "APPROVE"
    ? await SponsoredSlotService.approve(id, session.user!.id!)
    : await SponsoredSlotService.reject(id);

  return NextResponse.json({ success: true, slot });
}
