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

  try {
    const campaign = await CampaignService.activate(id);
    return NextResponse.json({ success: true, campaign });
  } catch (err) {
    if (err instanceof Error && err.message === "MAX_ACTIVE_CAMPAIGNS_REACHED") {
      return NextResponse.json(
        { error: "Only 2 campaigns can be active at once. Deactivate one first." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Could not activate campaign" }, { status: 500 });
  }
}
