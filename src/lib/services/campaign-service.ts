import { prisma } from "@/lib/prisma";
import type { CampaignType, CampaignStatus, CampaignEventType } from "@prisma/client";

/**
 * CampaignService — Phase 5.2
 *
 * Enforces the one rule this whole system hinges on: at most 2
 * campaigns may be ACTIVE at the same time. That's checked here, in one
 * place, so no future admin route can accidentally bypass it.
 */
export class CampaignService {
  static readonly MAX_ACTIVE = 2;

  static async getAll() {
    return prisma.campaign.findMany({ orderBy: [{ status: "asc" }, { priority: "desc" }] });
  }

  static async getById(id: string) {
    return prisma.campaign.findUnique({ where: { id } });
  }

  static async getBySlug(slug: string) {
    return prisma.campaign.findUnique({ where: { slug } });
  }

  /**
   * The campaigns currently live for real users — self-healing on read:
   * a campaign whose `endAt` has passed is treated as EXPIRED here even
   * if its `status` column hasn't been flipped yet (same lazy-expiry
   * pattern as MembershipService). Capped at MAX_ACTIVE, highest
   * priority first, even if more than 2 rows somehow have status=ACTIVE
   * (defense in depth on top of the write-time check below).
   */
  static async getActiveCampaigns() {
    const now = new Date();
    const candidates = await prisma.campaign.findMany({
      where: { status: "ACTIVE" },
      orderBy: { priority: "desc" },
    });

    const stillLive = candidates.filter((c) => !c.endAt || c.endAt > now);
    const expiredIds = candidates.filter((c) => c.endAt && c.endAt <= now).map((c) => c.id);
    if (expiredIds.length > 0) {
      await prisma.campaign.updateMany({ where: { id: { in: expiredIds } }, data: { status: "EXPIRED" } });
    }

    return stillLive.slice(0, this.MAX_ACTIVE);
  }

  /**
   * @throws Error("MAX_ACTIVE_CAMPAIGNS_REACHED") if 2 other campaigns
   * are already ACTIVE. The admin must deactivate one first — this
   * service deliberately does NOT auto-deactivate anything on the
   * admin's behalf, so a campaign never gets turned off as a surprise
   * side effect of turning another one on.
   */
  static async activate(id: string) {
    const activeCount = await prisma.campaign.count({ where: { status: "ACTIVE", id: { not: id } } });
    if (activeCount >= this.MAX_ACTIVE) {
      throw new Error("MAX_ACTIVE_CAMPAIGNS_REACHED");
    }
    return prisma.campaign.update({ where: { id }, data: { status: "ACTIVE" } });
  }

  static async deactivate(id: string) {
    return prisma.campaign.update({ where: { id }, data: { status: "INACTIVE" } });
  }

  static async schedule(id: string, startAt: Date, endAt: Date | null) {
    return prisma.campaign.update({ where: { id }, data: { status: "SCHEDULED", startAt, endAt } });
  }

  static async updateConfig(id: string, config: unknown) {
    return prisma.campaign.update({ where: { id }, data: { config: config as any } });
  }

  static async updatePriority(id: string, priority: number) {
    return prisma.campaign.update({ where: { id }, data: { priority } });
  }

  // -------------------------------------------------------------------
  // Event tracking — awaited (not fire-and-forget) because security
  // checks (e.g. "already opened today") read this data back
  // immediately afterward and must see a consistent result.
  // -------------------------------------------------------------------

  static async recordEvent(params: {
    userId: string;
    campaignId: string;
    eventType: CampaignEventType;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.campaignEvent.create({
      data: {
        userId: params.userId,
        campaignId: params.campaignId,
        eventType: params.eventType,
        metadata: params.metadata as any,
      },
    });
  }

  static async hasEventToday(userId: string, campaignId: string, eventType: CampaignEventType): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = await prisma.campaignEvent.count({
      where: { userId, campaignId, eventType, createdAt: { gte: startOfDay } },
    });
    return count > 0;
  }

  // -------------------------------------------------------------------
  // Admin analytics per campaign
  // -------------------------------------------------------------------

  static async getStats(campaignId: string) {
    const [participants, rewardsGiven, shares, purchaseEvents, allUserIds] = await Promise.all([
      prisma.campaignEvent.groupBy({ by: ["userId"], where: { campaignId, eventType: "VIEW" } }).then((r) => r.length),
      prisma.campaignEvent.count({ where: { campaignId, eventType: "REWARD_RECEIVED" } }),
      prisma.campaignEvent.count({ where: { campaignId, eventType: "SHARE" } }),
      prisma.campaignEvent.findMany({ where: { campaignId, eventType: "PURCHASE_AFTER_CAMPAIGN" }, select: { metadata: true, userId: true } }),
      prisma.campaignEvent.groupBy({ by: ["userId"], where: { campaignId, eventType: "PLAY" } }),
    ]);

    const revenueGenerated = purchaseEvents.reduce((sum, e) => {
      const amount = (e.metadata as any)?.orderTotal;
      return sum + (typeof amount === "number" ? amount : 0);
    }, 0);

    const conversionRate = participants > 0 ? (purchaseEvents.length / participants) * 100 : 0;

    // Returning users: played this campaign on more than one distinct calendar day.
    const playEvents = await prisma.campaignEvent.findMany({
      where: { campaignId, eventType: "PLAY" },
      select: { userId: true, createdAt: true },
    });
    const daysByUser = new Map<string, Set<string>>();
    for (const e of playEvents) {
      const day = e.createdAt.toISOString().slice(0, 10);
      const set = daysByUser.get(e.userId) ?? new Set();
      set.add(day);
      daysByUser.set(e.userId, set);
    }
    const returningUsers = [...daysByUser.values()].filter((days) => days.size > 1).length;

    return { participants, rewardsGiven, shares, revenueGenerated, conversionRate, returningUsers };
  }
}
