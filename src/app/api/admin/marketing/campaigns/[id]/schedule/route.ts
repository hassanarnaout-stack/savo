import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CampaignService } from "@/lib/services/campaign-service";
import { z } from "zod";

const schema = z.object({
  startAt: z.string(),
  endAt: z.string().nullable(),
});

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
  const body = schema.parse(await req.json());

  const campaign = await CampaignService.schedule(id, new Date(body.startAt), body.endAt ? new Date(body.endAt) : null);
  return NextResponse.json({ success: true, campaign });
}
