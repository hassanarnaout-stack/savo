import { prisma } from "@/lib/prisma";

/**
 * SmartRecommendationService — Phase 5.3 §10
 *
 * Every recommendation is computed from real product/category data
 * (views vs. sales, recent activity) — not a fixed list of canned
 * strings. If the underlying numbers don't support a recommendation,
 * nothing is shown for that product/category.
 */
export interface Recommendation {
  type: "DISCOUNT_CANDIDATE" | "CATEGORY_NEEDS_ACTIVATION";
  message: string;
  entityId: string;
  entityName: string;
}

export class SmartRecommendationService {
  /** High views, low sales relative to views — a real discount candidate. */
  static async getDiscountCandidates(limit = 5): Promise<Recommendation[]> {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", viewCount: { gte: 20 } },
      select: { id: true, name: true, viewCount: true, orderCount: true },
      orderBy: { viewCount: "desc" },
      take: 50,
    });

    return products
      .map((p) => ({ ...p, rate: p.viewCount > 0 ? p.orderCount / p.viewCount : 0 }))
      .filter((p) => p.rate < 0.02)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit)
      .map((p) => ({
        type: "DISCOUNT_CANDIDATE" as const,
        message: `${p.name} has ${p.viewCount} views but only ${p.orderCount} orders — consider a discount campaign to convert that traffic.`,
        entityId: p.id,
        entityName: p.name,
      }));
  }

  /** Categories with no recent order activity — genuinely need a push. */
  static async getCategoriesNeedingActivation(limit = 5): Promise<Recommendation[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      select: {
        id: true,
        name: true,
        products: {
          select: {
            orderItems: {
              where: { supplierOrder: { order: { createdAt: { gte: thirtyDaysAgo } } } },
              select: { id: true },
            },
          },
        },
      },
    });

    return categories
      .map((c) => ({ id: c.id, name: c.name, recentOrders: c.products.reduce((sum, p) => sum + p.orderItems.length, 0) }))
      .filter((c) => c.recentOrders === 0)
      .slice(0, limit)
      .map((c) => ({
        type: "CATEGORY_NEEDS_ACTIVATION" as const,
        message: `${c.name} has had no orders in the last 30 days — this section needs an activation campaign.`,
        entityId: c.id,
        entityName: c.name,
      }));
  }

  static async getAll(): Promise<Recommendation[]> {
    const [discountCandidates, categoriesNeedingActivation] = await Promise.all([
      this.getDiscountCandidates(),
      this.getCategoriesNeedingActivation(),
    ]);
    return [...discountCandidates, ...categoriesNeedingActivation];
  }
}
