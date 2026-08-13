import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LimitedTimeHuntService } from "@/lib/services/limited-time-hunt-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const live = await LimitedTimeHuntService.getLiveHunt();
  if (!live) return NextResponse.json({ available: false });

  let alreadyClaimed = false;
  if (session?.user?.id) {
    const claimed = await prisma.campaignEvent.findFirst({
      where: { campaignId: live.campaign.id, userId: session.user.id, eventType: "REWARD_RECEIVED" },
    });
    alreadyClaimed = !!claimed;
  }

  return NextResponse.json({
    available: true,
    campaignId: live.campaign.id,
    endAt: live.campaign.endAt,
    spotsLeft: live.spotsLeft,
    maxWinners: live.config.maxWinners,
    alreadyClaimed,
    customerDescription: live.campaign.customerDescription,
    customerDescriptionAr: live.campaign.customerDescriptionAr,
  });
}
