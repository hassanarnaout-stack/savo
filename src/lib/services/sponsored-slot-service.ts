import { prisma } from "@/lib/prisma";
import { SponsoredBillingService } from "@/lib/services/sponsored-billing-service";

/**
 * SponsoredSlotService — Phase 5.4 §3, also serves as the
 * BrandPlacementEngine (Phase 5.7 §7).
 *
 * "Paid products appear in designated spots while preserving user
 * experience" — enforced by capping how many sponsored slots any
 * placement type shows at once, always filtered to genuinely ACTIVE +
 * within-window + purchasable products. Ordering considers package tier
 * (Spotlight > Premium > Standard/none) first, then the slot's own
 * priority as a tiebreaker — a paying-more-for-visibility brand
 * naturally outranks a lower tier at the same priority, without ever
 * exceeding MAX_SLOTS_PER_PLACEMENT.
 */
export class SponsoredSlotService {
  static readonly MAX_SLOTS_PER_PLACEMENT = 3;

  private static readonly PACKAGE_WEIGHT: Record<string, number> = { SPOTLIGHT: 3, PREMIUM: 2, STANDARD: 1, ENTERPRISE: 4 };

  static async getLiveSlots(placementType: string, limit = this.MAX_SLOTS_PER_PLACEMENT) {
    const now = new Date();
    const candidates = await prisma.sponsoredSlot.findMany({
      where: {
        placementType: placementType as any,
        status: "ACTIVE",
        startAt: { lte: now },
        endAt: { gt: now },
        product: { status: "ACTIVE", approvalStatus: "APPROVED", stockQty: { gt: 0 } },
      },
      include: {
        product: { select: { id: true, name: true, nameAr: true, slug: true, saveoPrice: true, originalPrice: true, discountPct: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } },
        brand: {
          select: {
            companyName: true,
            subscriptions: { where: { status: "ACTIVE", endAt: { gt: now } }, select: { package: { select: { type: true } } }, take: 1 },
          },
        },
      },
    });

    const ranked = candidates
      .map((slot) => ({
        slot,
        packageWeight: this.PACKAGE_WEIGHT[slot.brand.subscriptions[0]?.package?.type ?? ""] ?? 0,
      }))
      .sort((a, b) => b.packageWeight - a.packageWeight || b.slot.priority - a.slot.priority)
      .slice(0, limit)
      .map((r) => r.slot);

    return ranked;
  }

  static async create(params: { brandId: string; productId: string; placementType: string; priority: number; budget: number; cpc?: number; cpm?: number; dailySpendLimit?: number; startAt: Date; endAt: Date }) {
    // Always DRAFT on creation — the date range being "current" is not admin approval. See approve().
    return prisma.sponsoredSlot.create({ data: { ...params, placementType: params.placementType as any, status: "DRAFT", requiresApproval: true } as any });
  }

  /** The ONLY path that moves a slot to ACTIVE — always an explicit admin action, never automatic. */
  static async approve(slotId: string, adminUserId: string) {
    const slot = await prisma.sponsoredSlot.findUniqueOrThrow({ where: { id: slotId } });
    const now = new Date();
    const status = slot.startAt <= now && slot.endAt > now ? "ACTIVE" : "DRAFT"; // still respects the date window even after approval
    return prisma.sponsoredSlot.update({
      where: { id: slotId },
      data: { status, approvedByUserId: adminUserId, approvedAt: now },
    });
  }

  static async reject(slotId: string) {
    return prisma.sponsoredSlot.update({ where: { id: slotId }, data: { status: "PAUSED" } });
  }

  static async recordImpression(slotId: string, brandId: string, userId?: string) {
    return SponsoredBillingService.recordImpression(slotId, brandId, userId);
  }

  static async recordClick(slotId: string, brandId: string, userId?: string) {
    return SponsoredBillingService.recordClick(slotId, brandId, userId);
  }
}
