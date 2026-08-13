/**
 * Personalized Feed Engine — Future Hook (Phase 4.1)
 *
 * Not implemented yet. Once user behavior is tracked server-side (views,
 * favorites, purchases, dwell time), this is where a mixed, ranked feed
 * of sections (not just flat products) would be assembled per user —
 * e.g. "because you liked X", "deals in categories you browse", etc.
 *
 * Kept deliberately separate from RecommendationEngine
 * (src/lib/recommendation-engine.ts): a recommendation engine ranks
 * PRODUCTS; a personalized feed ranks and mixes ENTIRE SECTIONS/BLOCKS of
 * the homepage itself (which rail shows first, which gets more real
 * estate, etc.) — a bigger, later concern.
 */

export interface FeedBlock {
  type: "product_rail" | "banner" | "category_spotlight";
  title: string;
  productIds?: string[];
}

export interface PersonalizedFeedEngine {
  getFeedForUser(userId?: string | null): Promise<FeedBlock[]>;
}

/** No-op until server-side behavior tracking exists. Returns an empty feed
 * — callers fall back to the static, editorially-ordered homepage. */
class NotImplementedPersonalizedFeedEngine implements PersonalizedFeedEngine {
  async getFeedForUser(): Promise<FeedBlock[]> {
    return [];
  }
}

export const personalizedFeedEngine: PersonalizedFeedEngine = new NotImplementedPersonalizedFeedEngine();
