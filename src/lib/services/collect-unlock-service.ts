import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";

export class CampaignNotActiveError extends Error {
  constructor() {
    super("Collect & Unlock isn't available right now.");
    this.name = "CampaignNotActiveError";
  }
}

export class AlreadyUnlockedError extends Error {
  constructor() {
    super("You've already unlocked this reward.");
    this.name = "AlreadyUnlockedError";
  }
}

export class NotEnoughProgressError extends Error {
  constructor() {
    super("You haven't collected enough yet.");
    this.name = "NotEnoughProgressError";
  }
}

export class CollectUnlockService {
  static async getStatusForUser(userId: string) {
    const campaign = await CampaignService.getBySlug("collect-unlock");
    if (!campaign || campaign.status !== "ACTIVE") {
      return { available: false, progress: 0, target: 0, unlocked: false, campaign: null, reward: null };
    }

    const config = campaign.config as any;
    const target: number = config?.target ?? 5;

    const progress = await prisma.campaignEvent.count({
      where: { userId, campaignId: campaign.id, eventType: "PLAY" },
    });

    const unlocked = (await prisma.campaignEvent.count({ where: { userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED" } })) > 0;

    return { available: true, progress: Math.min(progress, target), target, unlocked, campaign, reward: config?.reward ?? null };
  }

  static async collect(userId: string) {
    const campaign = await CampaignService.getBySlug("collect-unlock");
    if (!campaign || campaign.status !== "ACTIVE") throw new CampaignNotActiveError();

    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "PLAY" });
  }

  static async unlock(userId: string) {
    const campaign = await CampaignService.getBySlug("collect-unlock");
    if (!campaign || campaign.status !== "ACTIVE") throw new CampaignNotActiveError();

    const alreadyUnlocked = (await prisma.campaignEvent.count({
      where: { userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED" },
    })) > 0;
    if (alreadyUnlocked) throw new AlreadyUnlockedError();

    const config = campaign.config as any;
    const target: number = config?.target ?? 5;
    const progress = await prisma.campaignEvent.count({ where: { userId, campaignId: campaign.id, eventType: "PLAY" } });
    if (progress < target) throw new NotEnoughProgressError();

    const reward = config?.reward ?? { type: "POINTS", label: "Unlocked Reward", value: 50 };
    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", metadata: reward });

    return reward;
  }
}
