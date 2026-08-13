/**
 * CAMPAIGN SUMMARY
 * ============================================================
 * ZERO INVENTED METRICS: CampaignEventType only has VIEW, START,
 * PLAY, REWARD_RECEIVED, SHARE, PURCHASE_AFTER_CAMPAIGN. There is
 * no CLICK or CART_ADD event type — those fields are honestly
 * null, not approximated from something else.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { CampaignSummary, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

export async function buildCampaignSummaries(): Promise<{ summaries: CampaignSummary[]; stats: BuildStats }> {
  const start = Date.now();
  let queryCount = 0;

  const [campaigns, events] = await Promise.all([
    prisma.campaign.findMany({ select: { id: true } }).then((r) => { queryCount++; return r; }),
    prisma.campaignEvent.groupBy({ by: ["campaignId", "eventType"], _count: true }).then((r) => { queryCount++; return r; }),
  ]);

  const byCampaign = new Map<string, Record<string, number>>();
  for (const e of events) {
    if (!byCampaign.has(e.campaignId)) byCampaign.set(e.campaignId, {});
    byCampaign.get(e.campaignId)![e.eventType] = e._count;
  }

  const summaries: CampaignSummary[] = campaigns.map((c) => {
    const counts = byCampaign.get(c.id) ?? {};
    const views = counts.VIEW ?? null;
    const plays = counts.PLAY ?? null;
    const interactions = (counts.PLAY ?? 0) + (counts.SHARE ?? 0) + (counts.START ?? 0);
    const purchases = counts.PURCHASE_AFTER_CAMPAIGN ?? null;

    const conversionRate = views && views > 0 && purchases !== null ? Number((purchases / views).toFixed(4)) : null;

    const engagementPart = views && views > 0 ? Math.min(((plays ?? 0) / views) * 100, 100) : 0;
    const conversionPart = conversionRate !== null ? Math.min(conversionRate * 500, 100) : 0;
    const campaignScore = Math.round(Math.max(0, Math.min(100, engagementPart * 0.4 + conversionPart * 0.6)));

    return {
      campaignId: c.id,
      views,
      interactions: Object.keys(counts).length > 0 ? interactions : null,
      plays,
      clicks: null,
      cartAdds: null,
      purchases,
      revenue: null,
      conversionRate,
      roi: null,
      campaignScore,
      lastUpdated: new Date().toISOString(),
    };
  });

  const stats: BuildStats = { recordsProcessed: summaries.length, queryCount, durationMs: Date.now() - start };
  for (const s of summaries) warehouseCache.set(cacheKey("campaign", s.campaignId), s, stats);

  return { summaries, stats };
}

export function getCampaignSummary(campaignId: string): CampaignSummary | null {
  return warehouseCache.get<CampaignSummary>(cacheKey("campaign", campaignId));
}
