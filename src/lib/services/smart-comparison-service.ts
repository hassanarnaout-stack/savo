import { prisma } from "@/lib/prisma";

/**
 * SmartComparisonService — Phase 8.0 batch 3
 *
 * Every comparison dimension reuses real, already-tracked data: price
 * from Product itself, rating from the real Review average, calories/
 * sugar from ProductNutritionFact when both products have it entered.
 * No dimension is estimated — a product missing nutrition data just
 * shows "—" rather than a guessed number.
 */
export interface ComparisonProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number;
  avgRating: number | null;
  reviewCount: number;
  calories: number | null;
  sugarG: number | null;
}

export class SmartComparisonService {
  static async getComparableProducts(productId: string, limit = 3): Promise<{ current: ComparisonProduct; alternatives: ComparisonProduct[] }> {
    const current = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { id: true, categoryId: true, name: true, slug: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, nutritionFact: true, reviews: { where: { status: "APPROVED" }, select: { rating: true } } },
    });

    const alternativesRaw = await prisma.product.findMany({
      where: { categoryId: current.categoryId, status: "ACTIVE", approvalStatus: "APPROVED", id: { not: productId } },
      select: { id: true, name: true, slug: true, saveoPrice: true, orderCount: true, images: { take: 1, orderBy: { sortOrder: "asc" } }, nutritionFact: true, reviews: { where: { status: "APPROVED" }, select: { rating: true } } },
      orderBy: { orderCount: "desc" },
      take: limit,
    });

    const toComparisonProduct = (p: typeof current | (typeof alternativesRaw)[number]): ComparisonProduct => {
      const ratings = p.reviews.map((r) => r.rating);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.images[0]?.url ?? null,
        price: Number(p.saveoPrice),
        avgRating: ratings.length > 0 ? Number((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)) : null,
        reviewCount: ratings.length,
        calories: p.nutritionFact?.calories ?? null,
        sugarG: p.nutritionFact?.sugarG ?? null,
      };
    };

    return {
      current: toComparisonProduct(current),
      alternatives: alternativesRaw.map(toComparisonProduct),
    };
  }
}
