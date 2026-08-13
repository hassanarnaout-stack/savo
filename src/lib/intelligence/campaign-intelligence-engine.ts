/**
 * CAMPAIGN INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  CampaignEvent counts by real eventType (VIEW, PLAY,
 *          REWARD_RECEIVED, PURCHASE_AFTER_CAMPAIGN)
 * Processing: Real conversion funnel — VIEW -> PLAY -> REWARD_RECEIVED —
 *          plus the commercially decisive signal: did the campaign
 *          actually lead to a real purchase afterward.
 * Output:  score = campaign effectiveness (0-100)
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, confidenceFromSampleSize, clampScore } from "./types";

export async function computeCampaignIntelligence(campaignId: string): Promise<IntelligenceResult> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true, status: true } });
  const reason: string[] = [];

  if (!campaign) {
    return { score: 0, confidence: 0, reason: ["Campaign not found."], lastUpdated: new Date().toISOString() };
  }

  const events = await prisma.campaignEvent.groupBy({
    by: ["eventType"],
    where: { campaignId },
    _count: true,
  });

  const counts: Record<string, number> = {};
  for (const e of events) counts[e.eventType] = e._count;

  const views = counts.VIEW ?? 0;
  const plays = counts.PLAY ?? 0;
  const rewards = counts.REWARD_RECEIVED ?? 0;
  const purchasesAfter = counts.PURCHASE_AFTER_CAMPAIGN ?? 0;

  if (views === 0) {
    reason.push(`"${campaign.name}" has no recorded views yet.`);
    return { score: 0, confidence: 0, reason, lastUpdated: new Date().toISOString() };
  }

  const playRate = plays / views;
  const rewardRate = plays > 0 ? rewards / plays : 0;
  const purchaseConversionRate = views > 0 ? purchasesAfter / views : 0;

  const engagementScore = clampScore(playRate * 100);
  const completionScore = clampScore(rewardRate * 100);
  const commercialScore = clampScore(Math.min(purchaseConversionRate * 500, 100));

  const score = clampScore(engagementScore * 0.25 + completionScore * 0.25 + commercialScore * 0.5);

  reason.push(`${views} views, ${plays} plays (${(playRate * 100).toFixed(1)}% engagement rate).`);
  if (plays > 0) {
    reason.push(`${rewards} rewards granted (${(rewardRate * 100).toFixed(1)}% of plays).`);
  }
  reason.push(`${purchasesAfter} real purchase${purchasesAfter === 1 ? "" : "s"} attributed after this campaign (${(purchaseConversionRate * 100).toFixed(2)}% of viewers).`);
  if (campaign.status !== "ACTIVE") {
    reason.push(`Campaign is currently ${campaign.status.toLowerCase()} — this score reflects historical performance, not live traffic.`);
  }

  return {
    score,
    confidence: confidenceFromSampleSize(views, 100),
    reason,
    lastUpdated: new Date().toISOString(),
  };
}
