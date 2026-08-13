import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CampaignService } from "@/lib/services/campaign-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const campaign = await CampaignService.deactivate(id);
  return NextResponse.json({ success: true, campaign });
}
