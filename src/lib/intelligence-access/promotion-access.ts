/**
 * PROMOTION ACCESS
 * ============================================================
 * Real "live right now" filtering on every promotion source —
 * explicitly excludes DRAFT, expired, PAUSED, and isActive=false
 * rows.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { accessCache } from "./access-cache";
import { PromotionSummary } from "./types";

export async function getActivePromotions(limit = 10): Promise<PromotionSummary[]> {
  const cacheKey = `all:${limit}`;
  const cached = accessCache.get<PromotionSummary[]>("PROMOTION_DATA", cacheKey);
  if (cached) return cached.data;

  const take = Math.min(Math.max(limit, 1), 20);
  const now = new Date();

  const [campaigns, flashDeals, dealsOfHour, promoCodes] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "ACTIVE", OR: [{ endAt: null }, { endAt: { gt: now } }] },
      orderBy: { priority: "desc" },
      take,
      select: { id: true, name: true, customerDescription: true, endAt: true },
    }),
    prisma.flashDeal.findMany({
      where: { status: "LIVE", isActive: true, endAt: { gt: now } },
      take,
      select: { id: true, product: { select: { name: true } }, discountPercent: true, endAt: true },
    }),
    prisma.dealOfTheHour.findMany({
      where: { isActive: true, endTime: { gt: now } },
      take,
      select: { id: true, product: { select: { name: true } }, endTime: true },
    }),
    prisma.promoCode.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      take,
      select: { id: true, code: true, description: true, endsAt: true },
    }),
  ]);

  const promotions: PromotionSummary[] = [
    ...campaigns.map((c) => ({ id: c.id, name: c.name, type: "CAMPAIGN" as const, description: c.customerDescription, endsAt: c.endAt?.toISOString() ?? null })),
    ...flashDeals.map((f) => ({ id: f.id, name: f.product.name, type: "FLASH_DEAL" as const, description: `${f.discountPercent}% off`, endsAt: f.endAt.toISOString() })),
    ...dealsOfHour.map((d) => ({ id: d.id, name: d.product.name, type: "DEAL_OF_HOUR" as const, description: null, endsAt: d.endTime.toISOString() })),
    ...promoCodes.map((p) => ({ id: p.id, name: p.code, type: "COUPON" as const, description: p.description, endsAt: p.endsAt?.toISOString() ?? null })),
  ].slice(0, take);

  accessCache.set("PROMOTION_DATA", cacheKey, promotions);
  return promotions;
}
