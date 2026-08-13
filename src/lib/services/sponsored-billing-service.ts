import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * SponsoredBillingService — Phase 7.7
 *
 * Fills a real gap: SponsoredSlot.budget existed since Phase 5.4 but
 * nothing ever actually spent it. This service is the ONLY code path
 * that writes SponsoredSlot.spentTotal/spentToday, and it
 * auto-transitions a slot to COMPLETED the moment its budget or daily
 * limit is exhausted.
 *
 * Fraud check: more than FRAUD_CLICK_THRESHOLD clicks from the same
 * user on the same slot within FRAUD_WINDOW_MS is flagged and never
 * billed.
 */
const FRAUD_WINDOW_MS = 60 * 1000;
const FRAUD_CLICK_THRESHOLD = 5;

export class SponsoredBillingService {
  private static async rolloverDailySpendIfNeeded(slot: { id: string; spentToday: unknown; spentTodayDate: Date | null }) {
    const today = new Date().toDateString();
    const spentTodayDate = slot.spentTodayDate ? new Date(slot.spentTodayDate).toDateString() : null;
    if (spentTodayDate !== today) {
      await prisma.sponsoredSlot.update({ where: { id: slot.id }, data: { spentToday: 0, spentTodayDate: new Date() } });
      return 0;
    }
    return Number(slot.spentToday);
  }

  private static async checkFraud(slotId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;
    const since = new Date(Date.now() - FRAUD_WINDOW_MS);
    const recentClicks = await prisma.brandEvent.count({
      where: { eventType: "CLICK", userId, metadata: { path: ["slotId"], equals: slotId }, createdAt: { gte: since } },
    });
    return recentClicks >= FRAUD_CLICK_THRESHOLD;
  }

  private static async attemptCharge(slotId: string, cost: number): Promise<number> {
    if (cost <= 0) return 0;

    const slot = await prisma.sponsoredSlot.findUnique({ where: { id: slotId } });
    if (!slot || slot.status !== "ACTIVE") return 0;

    const spentToday = await this.rolloverDailySpendIfNeeded(slot);
    const spentTotal = Number(slot.spentTotal);
    const budget = Number(slot.budget);
    const dailyLimit = slot.dailySpendLimit ? Number(slot.dailySpendLimit) : null;

    if (spentTotal >= budget) {
      await prisma.sponsoredSlot.update({ where: { id: slotId }, data: { status: "COMPLETED" } });
      return 0;
    }
    if (dailyLimit !== null && spentToday >= dailyLimit) {
      return 0;
    }

    const remainingBudget = budget - spentTotal;
    const remainingDaily = dailyLimit !== null ? dailyLimit - spentToday : Infinity;
    const actualCost = Math.min(cost, remainingBudget, remainingDaily);
    if (actualCost <= 0) return 0;

    const newSpentTotal = spentTotal + actualCost;
    await prisma.sponsoredSlot.update({
      where: { id: slotId },
      data: {
        spentTotal: newSpentTotal,
        spentToday: { increment: actualCost },
        status: newSpentTotal >= budget ? "COMPLETED" : undefined,
      },
    });

    return actualCost;
  }

  static async recordImpression(slotId: string, brandId: string, userId?: string) {
    const slot = await prisma.sponsoredSlot.findUnique({ where: { id: slotId }, select: { cpm: true } });
    if (!slot) return;

    const costPerImpression = slot.cpm ? Number(slot.cpm) / 1000 : 0;
    const billed = await this.attemptCharge(slotId, costPerImpression);

    await prisma.brandEvent.create({
      data: { brandId, eventType: "IMPRESSION", userId, metadata: { slotId }, billedAmount: billed },
    }).catch((err) => logger.error("Failed to record sponsored impression", err, { slotId }));
  }

  static async recordClick(slotId: string, brandId: string, userId?: string) {
    const isFraud = await this.checkFraud(slotId, userId);
    if (isFraud) {
      await prisma.brandEvent.create({
        data: { brandId, eventType: "CLICK", userId, metadata: { slotId }, billedAmount: 0, isFlaggedFraud: true },
      }).catch(() => {});
      logger.info("Sponsored click flagged as potential fraud — not billed", { slotId, userId });
      return;
    }

    const slot = await prisma.sponsoredSlot.findUnique({ where: { id: slotId }, select: { cpc: true } });
    if (!slot) return;

    const billed = await this.attemptCharge(slotId, slot.cpc ? Number(slot.cpc) : 0);

    await prisma.brandEvent.create({
      data: { brandId, eventType: "CLICK", userId, metadata: { slotId }, billedAmount: billed },
    }).catch((err) => logger.error("Failed to record sponsored click", err, { slotId }));
  }
}
