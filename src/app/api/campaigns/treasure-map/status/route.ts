import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TreasureMapService } from "@/lib/services/treasure-map-service";
import { CampaignService } from "@/lib/services/campaign-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const status = await TreasureMapService.getNodesWithProgress(session.user.id);

  const campaign = await CampaignService.getBySlug("treasure-map");
  if (campaign) {
    CampaignService.recordEvent({ userId: session.user.id, campaignId: campaign.id, eventType: "VIEW" });
  }

  return NextResponse.json(status);
}
