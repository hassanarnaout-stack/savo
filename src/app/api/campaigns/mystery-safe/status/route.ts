import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MysterySafeService } from "@/lib/services/mystery-safe-service";
import { CampaignService } from "@/lib/services/campaign-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const status = await MysterySafeService.getStatusForUser(session.user.id);

  const campaign = await CampaignService.getBySlug("mystery-safe");
  if (campaign) {
    CampaignService.recordEvent({ userId: session.user.id, campaignId: campaign.id, eventType: "VIEW" });
  }

  return NextResponse.json(status);
}
