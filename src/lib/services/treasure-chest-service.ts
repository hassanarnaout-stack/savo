import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";

/**
 * TreasureChestService — Phase 5.2's first full campaign experience.
 *
 * Security posture (per the phase brief): every reward is selected and
 * recorded server-side. The client never sends a reward value — it only
 * ever receives one, after the server has already decided and persisted
 * it. "Already opened today" is derived from CampaignEvent rows, not
 * from anything the client claims.
 */

export interface RewardPoolItem {
  type: "DISCOUNT" | "FREE_DELIVERY" | "POINTS" | "MYSTERY_BOX" | "CREDIT" | "GOLDEN_TICKET";
  label: string;
  value: number | null;
  weight: number;
}

export class AlreadyOpenedTodayError extends Error {
  constructor() {
    super("You've already opened your Treasure Chest today — come back tomorrow!");
    this.name = "AlreadyOpenedTodayError";
  }
}

export class CampaignNotActiveError extends Error {
  constructor() {
    super("Treasure Chest isn't available right now.");
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

export class TreasureChestService {
  static async getStatusForUser(userId: string) {
    const campaign = await CampaignService.getBySlug("treasure");
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

  /** The actual open — the only place a reward is decided. Idempotency (one open per day) is enforced here, not trusted from the client. */
  static async open(userId: string) {
    const campaign = await CampaignService.getBySlug("treasure");
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
      throw new Error("Treasure Chest has no reward pool configured.");
    }

    const reward = weightedPick(pool);
    let promoCode: string | null = null;

    if (reward.type === "DISCOUNT" && reward.value) {
      // A real, single-use promo code — see the service file's header
      // comment on redemption status: PromoCode rows aren't consumed by
      // checkout yet anywhere in the app (a pre-existing gap, not new to
      // this feature), so this is genuine, ready infrastructure rather
      // than an immediately-redeemable code today.
      promoCode = `CHEST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await prisma.promoCode.create({
        data: {
          code: promoCode,
          description: `Treasure Chest reward for user ${userId}`,
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
