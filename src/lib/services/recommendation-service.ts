import { prisma } from "@/lib/prisma";

/**
 * RecommendationService — Phase 4.3
 *
 * "Recommended For You", stage 1 (per spec): Recently Viewed -> most
 * popular categories -> best sellers. No AI/ML yet — that's stage 2,
 * represented by `RecommendationStrategy` in
 * src/lib/recommendation-engine.ts (built in Phase 4.1), which this
 * service composes rather than duplicates.
 *
 * "Most visited categories" is approximated today via site-wide order
 * volume per category (we don't yet log individual page views per user
 * server-side) — documented here so swapping in a real view-tracking
 * signal later is a one-function change, not an architecture change.
 */

const productCardSelect = {
  id: true,
  name: true,
  nameAr: true,
  slug: true,
  originalPrice: true,
  saveoPrice: true,
  discountPct: true,
  stockQty: true,
  type: true,
  dealEndsAt: true,
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
};

export class RecommendationService {
  /**
   * @param recentlyViewedIds Client-supplied (from localStorage — see
   *   src/lib/recently-viewed.ts). Server has no other way to know this
   *   for anonymous/non-tracked sessions, so it's an explicit parameter
   *   rather than something this service looks up itself.
   */
  static async getRecommendedForUser(params: { recentlyViewedIds?: string[]; take?: number } = {}) {
    const take = params.take ?? 8;
    const recentlyViewedIds = params.recentlyViewedIds ?? [];

    if (recentlyViewedIds.length > 0) {
      const viewedCategories = await prisma.product.findMany({
        where: { id: { in: recentlyViewedIds } },
        select: { categoryId: true },
      });
      const categoryIds = [...new Set(viewedCategories.map((p) => p.categoryId))];

      if (categoryIds.length > 0) {
        const sameCategory = await prisma.product.findMany({
          where: { status: "ACTIVE", approvalStatus: "APPROVED", categoryId: { in: categoryIds }, id: { notIn: recentlyViewedIds } },
          orderBy: { orderCount: "desc" },
          take,
          select: productCardSelect,
        });
        if (sameCategory.length >= take) {
          return sameCategory.map((p) => ({ ...p, reason: "recently_viewed_category" as const }));
        }
        // Not enough — top up with best sellers below rather than returning a short list.
        const bestSellers = await prisma.product.findMany({
          where: { status: "ACTIVE", approvalStatus: "APPROVED", id: { notIn: [...recentlyViewedIds, ...sameCategory.map((p) => p.id)] } },
          orderBy: { orderCount: "desc" },
          take: take - sameCategory.length,
          select: productCardSelect,
        });
        return [
          ...sameCategory.map((p) => ({ ...p, reason: "recently_viewed_category" as const })),
          ...bestSellers.map((p) => ({ ...p, reason: "best_seller" as const })),
        ];
      }
    }

    // No recently-viewed signal available — fall back to most-popular
    // categories (approximated via order volume) blended with best sellers.
    const topCategoryProducts = await this.getTopCategoryProducts(take);
    return topCategoryProducts.map((p) => ({ ...p, reason: "best_seller" as const }));
  }

  /** Most-popular-category products, ranked by site-wide order volume. */
  private static async getTopCategoryProducts(take: number) {
    const topCategories = await prisma.product.groupBy({
      by: ["categoryId"],
      where: { status: "ACTIVE", approvalStatus: "APPROVED" },
      _sum: { orderCount: true },
      orderBy: { _sum: { orderCount: "desc" } },
      take: 3,
    });

    if (topCategories.length === 0) {
      return prisma.product.findMany({
        where: { status: "ACTIVE", approvalStatus: "APPROVED" },
        orderBy: { orderCount: "desc" },
        take,
        select: productCardSelect,
      });
    }

    return prisma.product.findMany({
      where: { status: "ACTIVE", approvalStatus: "APPROVED", categoryId: { in: topCategories.map((c) => c.categoryId) } },
      orderBy: { orderCount: "desc" },
      take,
      select: productCardSelect,
    });
  }
}
