import { CampaignService } from "@/lib/services/campaign-service";
import { WalletService } from "@/lib/services/wallet-service";

export class AlreadyRevealedTodayError extends Error {
  constructor() {
    super("You've already revealed your Hidden Cashback today — come back tomorrow!");
    this.name = "AlreadyRevealedTodayError";
  }
}

export class CampaignNotActiveError extends Error {
  constructor() {
    super("Hidden Cashback isn't available right now.");
    this.name = "CampaignNotActiveError";
  }
}

export class HiddenCashbackService {
  static async getStatusForUser(userId: string) {
    const campaign = await CampaignService.getBySlug("hidden-cashback");
    if (!campaign || campaign.status !== "ACTIVE") {
      return { available: false, alreadyRevealedToday: false, campaign: null, todaysAmount: null };
    }

    const alreadyRevealedToday = await CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED");
    let todaysAmount = null;
    if (alreadyRevealedToday) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { prisma } = await import("@/lib/prisma");
      const event = await prisma.campaignEvent.findFirst({
        where: { userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", createdAt: { gte: startOfDay } },
        orderBy: { createdAt: "desc" },
      });
      todaysAmount = (event?.metadata as any)?.amount ?? null;
    }

    return { available: true, alreadyRevealedToday, campaign, todaysAmount };
  }

  static async reveal(userId: string) {
    const campaign = await CampaignService.getBySlug("hidden-cashback");
    if (!campaign || campaign.status !== "ACTIVE") throw new CampaignNotActiveError();

    const alreadyRevealed = await CampaignService.hasEventToday(userId, campaign.id, "REWARD_RECEIVED");
    if (alreadyRevealed) throw new AlreadyRevealedTodayError();

    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "PLAY" });

    const config = campaign.config as any;
    const minAmount: number = config?.minAmount ?? 0.5;
    const maxAmount: number = config?.maxAmount ?? 3;
    const amount = Math.round((minAmount + Math.random() * (maxAmount - minAmount)) * 1000) / 1000;

    await WalletService.credit(userId, amount, "Hidden Cashback reward");

    const metadata = { amount };
    await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", metadata });

    return { amount };
  }
}
