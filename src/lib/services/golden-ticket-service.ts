import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";

/**
 * GoldenTicketService — Phase 5.2
 *
 * Rolled once per completed order. Odds and reward are entirely
 * admin-configurable via the campaign's `config` JSON (edited through
 * CampaignService.updateConfig — no code change needed to adjust them).
 * Stopping the system is just deactivating the campaign, same as any
 * other campaign.
 */
export class GoldenTicketService {
  /** Called from checkout after an order completes. Never throws — a roll failure must never affect the order itself. */
  static async rollForOrder(userId: string, orderId: string): Promise<{ won: boolean; reward?: unknown }> {
    try {
      const campaign = await CampaignService.getBySlug("golden-ticket");
      if (!campaign || campaign.status !== "ACTIVE") return { won: false };

      const config = campaign.config as any;
      const odds: number = config?.odds ?? 20; // 1-in-`odds` chance
      const reward = config?.reward ?? { label: "Golden Ticket Prize", type: "MYSTERY_BOX" };

      const won = Math.floor(Math.random() * odds) === 0;

      await CampaignService.recordEvent({ userId, campaignId: campaign.id, eventType: "PLAY", metadata: { orderId } });

      if (won) {
        await CampaignService.recordEvent({
          userId,
          campaignId: campaign.id,
          eventType: "REWARD_RECEIVED",
          metadata: { ...reward, orderId },
        });
      }

      return { won, reward: won ? reward : undefined };
    } catch {
      return { won: false }; // fail-safe — never break checkout over a golden ticket roll
    }
  }
}
