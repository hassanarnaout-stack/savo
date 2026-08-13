/**
 * RECOMMENDATION ACCESS
 * ============================================================
 * Reads the existing RecommendationService.getRecommendedForUser —
 * the recommendation logic itself is NOT reimplemented here. If
 * that service returns nothing or throws, this returns [], never
 * invented recommendations.
 * ============================================================
 */
import { RecommendationService } from "@/lib/services/recommendation-service";
import { RecommendationItem } from "./types";

export async function getRelevantRecommendations(recentlyViewedIds: string[] = [], limit = 8): Promise<RecommendationItem[]> {
  const take = Math.min(Math.max(limit, 1), 20);

  try {
    const results = await RecommendationService.getRecommendedForUser({ recentlyViewedIds, take });
    return results.map((r) => ({
      productId: r.id,
      productName: r.name,
      slug: r.slug,
      price: Number(r.saveoPrice),
      originalPrice: Number(r.originalPrice),
      image: r.images[0]?.url ?? null,
      stockQty: r.stockQty,
      reason: r.reason,
    }));
  } catch {
    return [];
  }
}
