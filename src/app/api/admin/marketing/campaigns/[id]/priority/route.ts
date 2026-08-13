import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CampaignService } from "@/lib/services/campaign-service";
import { z } from "zod";

const schema = z.object({ priority: z.number().int() });

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
  const { priority } = schema.parse(await req.json());
  const campaign = await CampaignService.updatePriority(id, priority);
  return NextResponse.json({ success: true, campaign });
}
