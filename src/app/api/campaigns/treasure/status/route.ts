import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TreasureChestService } from "@/lib/services/treasure-chest-service";
import { CampaignService } from "@/lib/services/campaign-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const status = await TreasureChestService.getStatusForUser(session.user.id);

  if (status.campaign) {
    CampaignService.recordEvent({ userId: session.user.id, campaignId: status.campaign.id, eventType: "VIEW" });
  }

  return NextResponse.json(status);
}
