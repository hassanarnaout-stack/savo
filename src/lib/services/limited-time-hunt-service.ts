import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";

/**
 * LimitedTimeHuntService — Phase 5.3 §9
 *
 * Reuses the Campaign Engine built in Phase 5.2 (Campaign + CampaignEvent)
 * rather than introducing parallel infrastructure — this is just a new
 * CampaignType with its own config shape and claim logic:
 *   config: { productId, maxWinners, reward: { type, label, value } }
 *
 * "First N to claim wins" — the claim count check happens inside a
 * transaction so two near-simultaneous claims can't both slip in as the
 * last winning slot.
 */

export class HuntNotLiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HuntNotLiveError";
  }
}

export class LimitedTimeHuntService {
  static async getLiveHunt() {
    const active = await CampaignService.getActiveCampaigns();
    const hunt = active.find((c) => c.type === "LIMITED_TIME_HUNT");
    if (!hunt) return null;

    const config = hunt.config as any;
    const winnersCount = await prisma.campaignEvent.count({
      where: { campaignId: hunt.id, eventType: "REWARD_RECEIVED" },
    });
    const spotsLeft = Math.max(0, (config.maxWinners ?? 0) - winnersCount);
    if (spotsLeft === 0) return null; // all winning spots claimed — hunt effectively over even if the timer hasn't run out

    return { campaign: hunt, config, spotsLeft };
  }

  static async claim(userId: string) {
    return prisma.$transaction(async (tx) => {
      const active = await tx.campaign.findMany({ where: { status: "ACTIVE", type: "LIMITED_TIME_HUNT" } });
      const now = new Date();
      const hunt = active.find((c) => (!c.startAt || c.startAt <= now) && (!c.endAt || c.endAt > now));
      if (!hunt) throw new HuntNotLiveError("There's no active hunt right now.");

      const config = hunt.config as any;
      const maxWinners: number = config.maxWinners ?? 0;

      const alreadyClaimed = await tx.campaignEvent.findFirst({
        where: { campaignId: hunt.id, userId, eventType: "REWARD_RECEIVED" },
      });
      if (alreadyClaimed) throw new HuntNotLiveError("You've already claimed this hunt's reward.");

      const winnersCount = await tx.campaignEvent.count({
        where: { campaignId: hunt.id, eventType: "REWARD_RECEIVED" },
      });
      if (winnersCount >= maxWinners) throw new HuntNotLiveError("Sorry — all winning spots have been claimed.");

      const reward = config.reward ?? { type: "POINTS", label: "Hunt Reward", value: null };
      await tx.campaignEvent.create({
        data: { campaignId: hunt.id, userId, eventType: "REWARD_RECEIVED", metadata: reward },
      });

      return reward;
    });
  }
}
