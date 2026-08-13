/**
 * Recommendation & Cross-Sell Analytics Events — Phase 4.3
 *
 * Same placeholder pattern as src/lib/mystery-box-analytics.ts: no
 * dashboard/storage backend yet, single dispatch point so a real
 * analytics provider can be wired in later without touching call sites.
 */

export type RecommendationEventType =
  | "VIEWED_RECOMMENDATION"
  | "CLICKED_RECOMMENDATION"
  | "ADDED_RECOMMENDED_PRODUCT"
  | "PURCHASED_RECOMMENDED_PRODUCT";

export type RecommendationSource =
  | "cross_sell"
  | "upsell"
  | "frequently_bought_together"
  | "related_products"
  | "recommended_for_you"
  | "smart_cart_suggestion"
  | "bundle";

export interface RecommendationEvent {
  type: RecommendationEventType;
  userId?: string | null;
  productId: string;
  source: RecommendationSource;
  data?: Record<string, unknown>;
  at: Date;
}

function dispatch(event: RecommendationEvent) {
  console.log(`[analytics:${event.type}]`, {
    userId: event.userId,
    productId: event.productId,
    source: event.source,
    data: event.data,
    at: event.at.toISOString(),
  });
}

export const RecommendationAnalytics = {
  viewed(productId: string, source: RecommendationSource, userId?: string | null) {
    dispatch({ type: "VIEWED_RECOMMENDATION", productId, source, userId, at: new Date() });
  },
  clicked(productId: string, source: RecommendationSource, userId?: string | null) {
    dispatch({ type: "CLICKED_RECOMMENDATION", productId, source, userId, at: new Date() });
  },
  added(productId: string, source: RecommendationSource, userId?: string | null, quantity = 1) {
    dispatch({ type: "ADDED_RECOMMENDED_PRODUCT", productId, source, userId, data: { quantity }, at: new Date() });
  },
  purchased(productId: string, source: RecommendationSource, userId: string, orderItemId: string) {
    dispatch({
      type: "PURCHASED_RECOMMENDED_PRODUCT",
      productId,
      source,
      userId,
      data: { orderItemId },
      at: new Date(),
    });
  },
};
