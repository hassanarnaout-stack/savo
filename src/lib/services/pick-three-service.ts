import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";
import type { RewardPoolItem } from "@/lib/services/treasure-chest-service";

export class AlreadyPlayedTodayError extends Error {
  constructor() {
    super("You've already picked today — come back tomorrow!");
    this.name = "AlreadyPlayedTodayError";
  }
}

export class CampaignNotActiveError extends Error {
  constructor() {
    super("Pick Three isn't available right now.");
    this.name = "CampaignNotActiveError";
  }
}

function weightedPick(pool: RewardPoolItem[]): RewardPoolItem {
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return pool[pool.length - 1];
}

export class PickThreeService {
  static async getStatusForUser(userId: string) {
    const campaign = await CampaignService.getBySlug("pick-three");
    if (!campaign || campaign.status !== "ACTIVE") {
      return { available: false, alreadyPlayedToday: false, campaign: null, todaysReward: null, numTiles: 9 };
    }

    const alreadyPlayedToday = await CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED");
    let todaysReward = null;
    if (alreadyPlayedToday) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const event = await prisma.campaignEvent.findFirst({
        where: { userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", createdAt: { gte: startOfDay } },
        orderBy: { createdAt: "desc" },
      });
      todaysReward = event?.metadata ?? null;
    }

    return { available: true, alreadyPlayedToday, campaign, todaysReward, numTiles: (campaign.config as any)?.numTiles ?? 9 };
  }

  /** Reveals 3 real results at once (matching the "Pick Three" name) and grants the single best one. All 3 are decided server-side in one call — the client never influences which reward wins. */
  static async pick(userId: string) {
    const campaign = await CampaignService.getBySlug("pick-three");
    if (!campaign || campaign.status !== "ACTIVE") throw new CampaignNotActiveError();

    const alreadyPlayed = await CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED");
    if (alreadyPlayed) throw new AlreadyPlayedTodayError();

    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "PLAY" });

    const pool = (campaign.config as any)?.rewardPool as RewardPoolItem[] | undefined;
    if (!pool || pool.length === 0) {
      throw new Error("Pick Three has no reward pool configured.");
    }

    // Draw 3 real results; the customer's chosen tile order in the UI is
    // purely presentational — the best of the 3 draws is always what's
    // actually granted, so tile choice can't be gamed by refreshing.
    const threeResults = [weightedPick(pool), weightedPick(pool), weightedPick(pool)];
    const reward = threeResults.reduce((best, item) => ((item.value ?? 0) > (best.value ?? 0) ? item : best), threeResults[0]);

    let promoCode: string | null = null;
    if (reward.type === "DISCOUNT" && reward.value) {
      promoCode = `PICK3-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await prisma.promoCode.create({
        data: {
          code: promoCode,
          description: `Pick Three reward for user ${userId}`,
          percentOff: reward.value,
          maxUses: 1,
          isActive: true,
        },
      });
    }

    const metadata = { rewardType: reward.type, label: reward.label, value: reward.value, promoCode, allThree: threeResults.map((r) => r.label) };

    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", metadata });

    return metadata;
  }
}
