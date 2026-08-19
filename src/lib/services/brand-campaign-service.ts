import { prisma } from "@/lib/prisma";

/**
 * BrandCampaignService — Phase 5.3 §10
 */
export class BrandCampaignService {
  static async create(params: {
    brandName: string;
    type: "SPONSORED_PRODUCT" | "HOMEPAGE_BANNER" | "CATEGORY_HIGHLIGHT" | "SEARCH_BOOST";
    productId?: string;
    categoryId?: string;
    bannerImageUrl?: string;
    bannerLinkUrl?: string;
    startDate: Date;
    endDate: Date;
    budget: number;
    headline?: string; headlineAr?: string;
    label?: string; labelAr?: string;
    ctaText?: string; ctaTextAr?: string;
    sortOrder?: number;
    showPrice?: boolean;
    showStockUrgency?: boolean;
  }) {
    return prisma.brandCampaign.create({ data: params });
  }

  static async update(id: string, params: Partial<{
    brandName: string; bannerImageUrl: string | null; bannerLinkUrl: string | null;
    startDate: Date; endDate: Date;
    headline: string | null; headlineAr: string | null;
    label: string | null; labelAr: string | null;
    ctaText: string | null; ctaTextAr: string | null;
    sortOrder: number; showPrice: boolean; showStockUrgency: boolean; productId: string | null;
  }>) {
    return prisma.brandCampaign.update({ where: { id }, data: params });
  }

  static async remove(id: string) {
    return prisma.brandCampaign.delete({ where: { id } });
  }

  static async setActive(id: string, isActive: boolean) {
    return prisma.brandCampaign.update({ where: { id }, data: { isActive } });
  }

  static async getAll() {
    return prisma.brandCampaign.findMany({
      orderBy: { startDate: "desc" },
      include: { product: { select: { name: true } }, category: { select: { name: true } } },
    });
  }

  /** Live sponsored placements of a given type right now — e.g. which homepage banner to show. */
  static async getLive(type: "SPONSORED_PRODUCT" | "HOMEPAGE_BANNER" | "CATEGORY_HIGHLIGHT" | "SEARCH_BOOST", categoryId?: string) {
    const now = new Date();
    return prisma.brandCampaign.findMany({
      where: {
        type,
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now },
        ...(categoryId ? { categoryId } : {}),
      },
      include: { product: { select: { name: true, slug: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
    });
  }

  static async track(brandCampaignId: string, eventType: "VIEW" | "CLICK" | "ADD_TO_CART" | "SALE", params?: { userId?: string; amount?: number }) {
    try {
      await prisma.sponsoredPlacement.create({
        data: { brandCampaignId, eventType, userId: params?.userId, amount: params?.amount },
      });
    } catch {
      // tracking must never break the page/action that triggered it
    }
  }

  static async getAnalytics(brandCampaignId: string) {
    const [views, clicks, addToCarts, sales] = await Promise.all([
      prisma.sponsoredPlacement.count({ where: { brandCampaignId, eventType: "VIEW" } }),
      prisma.sponsoredPlacement.count({ where: { brandCampaignId, eventType: "CLICK" } }),
      prisma.sponsoredPlacement.count({ where: { brandCampaignId, eventType: "ADD_TO_CART" } }),
      prisma.sponsoredPlacement.aggregate({ where: { brandCampaignId, eventType: "SALE" }, _count: true, _sum: { amount: true } }),
    ]);

    const conversionRate = views > 0 ? (sales._count / views) * 100 : 0;
    const clickThroughRate = views > 0 ? (clicks / views) * 100 : 0;

    return {
      views,
      clicks,
      addToCarts,
      salesCount: sales._count,
      salesRevenue: Number(sales._sum.amount ?? 0),
      conversionRate: Number(conversionRate.toFixed(2)),
      clickThroughRate: Number(clickThroughRate.toFixed(2)),
    };
  }
}
