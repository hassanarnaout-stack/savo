import { prisma } from "@/lib/prisma";

/**
 * MarketingCampaignService — Phase 5.3 (Marketing Studio)
 *
 * Formulas exactly as specified:
 *   CTR = Clicks / Views
 *   Conversion = Orders / Clicks
 *   ROI = (Revenue - Campaign Cost) / Campaign Cost
 */
export class MarketingCampaignService {
  static async create(params: {
    name: string;
    type: string;
    objective: string;
    budget: number;
    startAt: Date;
    endAt: Date;
    createdByUserId: string;
    variantOfId?: string;
  }) {
    const now = new Date();
    const status = params.startAt <= now && params.endAt > now ? "ACTIVE" : "DRAFT";
    return prisma.marketingCampaign.create({ data: { ...params, status } as any });
  }

  static async getAll() {
    const now = new Date();
    // Self-healing: an ACTIVE campaign whose endAt has passed shows as COMPLETED here even if the column hasn't been flipped yet.
    await prisma.marketingCampaign.updateMany({
      where: { status: "ACTIVE", endAt: { lte: now } },
      data: { status: "COMPLETED" },
    });
    return prisma.marketingCampaign.findMany({ orderBy: { createdAt: "desc" }, include: { variants: true } });
  }

  static async getById(id: string) {
    return prisma.marketingCampaign.findUnique({ where: { id }, include: { variants: true, variantOf: true } });
  }

  static async setStatus(id: string, status: "DRAFT" | "ACTIVE" | "COMPLETED") {
    return prisma.marketingCampaign.update({ where: { id }, data: { status } });
  }

  // -------------------------------------------------------------------
  // Event tracking (§6) — never trusts a client-supplied campaignId
  // without verifying the campaign actually exists first.
  // -------------------------------------------------------------------

  static async recordEvent(params: {
    campaignId: string;
    userId?: string;
    eventType: "VIEW" | "CLICK" | "ADD_TO_CART" | "CHECKOUT" | "PURCHASE" | "SHARE";
    metadata?: Record<string, unknown>;
  }) {
    const exists = await prisma.marketingCampaign.findUnique({ where: { id: params.campaignId }, select: { id: true } });
    if (!exists) return null; // silently drop — an unknown/forged campaignId is never trusted
    return prisma.marketingCampaignEvent.create({
      data: {
        campaignId: params.campaignId,
        userId: params.userId,
        eventType: params.eventType,
        metadata: params.metadata as any,
      },
    });
  }

  // -------------------------------------------------------------------
  // Analytics (§7)
  // -------------------------------------------------------------------

  static async getAnalytics(campaignId: string) {
    const campaign = await prisma.marketingCampaign.findUniqueOrThrow({ where: { id: campaignId } });

    const [views, clicks, addToCart, purchaseEvents] = await Promise.all([
      prisma.marketingCampaignEvent.count({ where: { campaignId, eventType: "VIEW" } }),
      prisma.marketingCampaignEvent.count({ where: { campaignId, eventType: "CLICK" } }),
      prisma.marketingCampaignEvent.count({ where: { campaignId, eventType: "ADD_TO_CART" } }),
      prisma.marketingCampaignEvent.findMany({ where: { campaignId, eventType: "PURCHASE" }, select: { metadata: true } }),
    ]);

    const orders = purchaseEvents.length;
    const revenue = purchaseEvents.reduce((sum, e) => {
      const amount = (e.metadata as any)?.orderTotal;
      return sum + (typeof amount === "number" ? amount : 0);
    }, 0);

    const campaignCost = Number(campaign.budget);
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;
    const roi = campaignCost > 0 ? ((revenue - campaignCost) / campaignCost) * 100 : 0;

    return {
      views,
      clicks,
      addToCart,
      orders,
      revenue: Number(revenue.toFixed(3)),
      ctr: Number(ctr.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      roi: Number(roi.toFixed(2)),
      campaignCost,
    };
  }

  /** A/B comparison (§8) — never auto-stops anything, just recommends. */
  static async compareVariants(campaignId: string) {
    const campaign = await this.getById(campaignId);
    if (!campaign) return null;

    const variantA = campaign.variantOfId ? campaign.variantOf! : campaign;
    const variantB = campaign.variantOfId ? campaign : campaign.variants[0];
    if (!variantB) return null; // no variant to compare against yet

    const [statsA, statsB] = await Promise.all([this.getAnalytics(variantA.id), this.getAnalytics(variantB.id)]);

    // Winner by conversion rate — the metric that best reflects actual business outcome, not just traffic.
    const winner = statsA.conversionRate === statsB.conversionRate ? null : statsA.conversionRate > statsB.conversionRate ? "A" : "B";

    return { variantA: { ...variantA, stats: statsA }, variantB: { ...variantB, stats: statsB }, winner };
  }
}
