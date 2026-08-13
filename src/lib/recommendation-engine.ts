import { RecommendationService } from "@/lib/services/recommendation-service";

/**
 * Recommendation Engine — Future Hook (Phase 4.1), now backed by
 * RecommendationService (Phase 4.3) for its concrete "stage 1" behavior.
 *
 * The homepage's "Recommended For You" section calls `getRecommendedForUser`
 * and does not know or care which strategy produced the results. Today
 * that's `FallbackRecommendationStrategy` (recently-viewed -> top
 * categories -> best-sellers, via RecommendationService).
 * Swapping in real personalization or an AI-ranked feed later means
 * implementing `RecommendationStrategy` and changing one line in
 * `getRecommendedForUser` — no caller anywhere else in the app changes.
 */

export interface RecommendationContext {
  userId?: string | null;
  /** Optional anchor — e.g. a category the user is currently browsing. */
  categoryId?: string | null;
  /** Client-supplied recently-viewed product ids (localStorage), when available. */
  recentlyViewedIds?: string[];
  take?: number;
}

export interface RecommendationStrategy {
  name: string;
  getRecommendations(ctx: RecommendationContext): Promise<RecommendedProduct[]>;
}

export interface RecommendedProduct {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  originalPrice: unknown;
  saveoPrice: unknown;
  discountPct: number;
  images: { url: string }[];
  reason: "same_category" | "best_seller" | "personalized" | "ai" | "recently_viewed_category";
}

/**
 * Delegates to RecommendationService.getRecommendedForUser — see that
 * file for the actual stage-1 logic (recently-viewed -> top categories ->
 * best-sellers). Kept as a thin adapter here so the pluggable-strategy
 * shape from Phase 4.1 (and the documented future hooks below) stays
 * intact for whoever builds stage 2.
 */
class FallbackRecommendationStrategy implements RecommendationStrategy {
  name = "recommendation-service-stage-1";

  async getRecommendations(ctx: RecommendationContext): Promise<RecommendedProduct[]> {
    const results = await RecommendationService.getRecommendedForUser({
      recentlyViewedIds: ctx.recentlyViewedIds,
      take: ctx.take,
    });
    return results as unknown as RecommendedProduct[];
  }
}

/**
 * FUTURE HOOKS — not implemented yet, deliberately:
 *
 * class PersonalizedRecommendationStrategy implements RecommendationStrategy {
 *   // would read a user's view/purchase/favorite history (once tracked
 *   // server-side per user) and rank candidates accordingly.
 * }
 *
 * class AIRecommendationStrategy implements RecommendationStrategy {
 *   // would call an embeddings/ranking model service.
 * }
 *
 * To activate either: implement the class above, then change
 * `activeStrategy` below. Every call site stays identical.
 */
const activeStrategy: RecommendationStrategy = new FallbackRecommendationStrategy();

export async function getRecommendedForUser(ctx: RecommendationContext = {}): Promise<RecommendedProduct[]> {
  return activeStrategy.getRecommendations(ctx);
}
