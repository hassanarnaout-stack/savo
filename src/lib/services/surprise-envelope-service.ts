import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";
import type { RewardPoolItem } from "@/lib/services/treasure-chest-service";

export class AlreadyOpenedTodayError extends Error {
  constructor() {
    super("You've already opened your Surprise Envelope today — come back tomorrow!");
    this.name = "AlreadyOpenedTodayError";
  }
}

export class CampaignNotActiveError extends Error {
  constructor() {
    super("Surprise Envelope isn't available right now.");
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

export class SurpriseEnvelopeService {
  static async getStatusForUser(userId: string) {
    const campaign = await CampaignService.getBySlug("surprise-envelope");
    if (!campaign || campaign.status !== "ACTIVE") {
      return { available: false, alreadyOpenedToday: false, campaign: null, todaysReward: null };
    }

    const alreadyOpenedToday = await CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED");
    let todaysReward = null;
    if (alreadyOpenedToday) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const event = await prisma.campaignEvent.findFirst({
        where: { userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", createdAt: { gte: startOfDay } },
        orderBy: { createdAt: "desc" },
      });
      todaysReward = event?.metadata ?? null;
    }

    return { available: true, alreadyOpenedToday, campaign, todaysReward };
  }

  static async open(userId: string) {
    const campaign = await CampaignService.getBySlug("surprise-envelope");
    if (!campaign || campaign.status !== "ACTIVE") {
      throw new CampaignNotActiveError();
    }

    const alreadyOpened = await CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED");
    if (alreadyOpened) {
      throw new AlreadyOpenedTodayError();
    }

    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "PLAY" });

    const pool = (campaign.config as any)?.rewardPool as RewardPoolItem[] | undefined;
    if (!pool || pool.length === 0) {
      throw new Error("Surprise Envelope has no reward pool configured.");
    }

    const reward = weightedPick(pool);
    let promoCode: string | null = null;

    if (reward.type === "DISCOUNT" && reward.value) {
      promoCode = `ENVELOPE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await prisma.promoCode.create({
        data: {
          code: promoCode,
          description: `Surprise Envelope reward for user ${userId}`,
          percentOff: reward.value,
          maxUses: 1,
          isActive: true,
        },
      });
    }

    const metadata = { rewardType: reward.type, label: reward.label, value: reward.value, promoCode };

    await CampaignService.recordEvent({
      userId,
      campaignId: campaign.id,
      eventType: "REWARD_RECEIVED",
      metadata,
    });

    return metadata;
  }
}
