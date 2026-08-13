import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";

/**
 * MysterySafeService — Phase 5.2
 *
 * A key is earned via a qualifying action (recorded as a `START` event
 * with `metadata.source`) and lets the user open the safe once that
 * calendar day. LOGIN and PURCHASE are wired to real triggers in this
 * codebase. REVIEW and REFERRAL are ready hooks — there is currently no
 * review-submission API and no referral system anywhere in this app (both
 * pre-existing gaps, not introduced here), so those two sources can't
 * fire yet. `grantKey` is written generically so wiring them up later is
 * a one-line call at whatever endpoint eventually handles them.
 */

export type KeySource = "LOGIN" | "PURCHASE" | "REVIEW" | "REFERRAL";

export class AlreadyOpenedSafeTodayError extends Error {
  constructor() {
    super("You've already opened the Mystery Safe today — come back tomorrow!");
    this.name = "AlreadyOpenedSafeTodayError";
  }
}

export class NoKeyAvailableError extends Error {
  constructor() {
    super("You need a Daily Key to open the safe — log in, make a purchase, leave a review, or refer a friend to earn one.");
    this.name = "NoKeyAvailableError";
  }
}

function weightedPick(pool: { type: string; label: string; value: number | null; weight: number }[]) {
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return pool[pool.length - 1];
}

export class MysterySafeService {
  static async grantKey(userId: string, source: KeySource) {
    const campaign = await CampaignService.getBySlug("mystery-safe");
    if (!campaign) return; // campaign not seeded — silently no-op, never block the action that earns the key
    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "START", metadata: { source } });
  }

  static async hasKeyToday(userId: string, campaignId: string): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = await prisma.campaignEvent.count({
      where: { userId, campaignId, eventType: "START", createdAt: { gte: startOfDay } },
    });
    return count > 0;
  }

  static async getStatusForUser(userId: string) {
    const campaign = await CampaignService.getBySlug("mystery-safe");
    if (!campaign || campaign.status !== "ACTIVE") {
      return { available: false, hasKey: false, alreadyOpenedToday: false, todaysReward: null };
    }

    const [hasKey, alreadyOpenedToday] = await Promise.all([
      this.hasKeyToday(userId, campaign.id),
      CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED"),
    ]);

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

    return { available: true, hasKey, alreadyOpenedToday, todaysReward, campaign };
  }

  static async open(userId: string) {
    const campaign = await CampaignService.getBySlug("mystery-safe");
    if (!campaign || campaign.status !== "ACTIVE") {
      throw new Error("Mystery Safe isn't available right now.");
    }

    const alreadyOpened = await CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED");
    if (alreadyOpened) throw new AlreadyOpenedSafeTodayError();

    const hasKey = await this.hasKeyToday(userId, campaign.id);
    if (!hasKey) throw new NoKeyAvailableError();

    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "PLAY" });

    const pool = (campaign.config as any)?.rewardPool as { type: string; label: string; value: number | null; weight: number }[] | undefined;
    if (!pool || pool.length === 0) throw new Error("Mystery Safe has no reward pool configured.");

    const reward = weightedPick(pool);
    let promoCode: string | null = null;

    if (reward.type === "DISCOUNT" && reward.value) {
      promoCode = `SAFE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await prisma.promoCode.create({
        data: {
          code: promoCode,
          description: `Mystery Safe reward for user ${userId}`,
          percentOff: reward.value,
          maxUses: 1,
          isActive: true,
        },
      });
    }

    const metadata = { rewardType: reward.type, label: reward.label, value: reward.value, promoCode };

    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", metadata });

    return metadata;
  }
}
