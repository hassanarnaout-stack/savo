import { prisma } from "@/lib/prisma";

/**
 * CustomerBehaviorEngine — Phase 6.8
 *
 * "Prepares Personalized Recommendations. Future AI: Next Best Product,
 * Smart Offers, Churn Prediction — no AI implemented now." Same honest
 * architecture-only pattern as AIBrandAssistantService (Phase 5.4/5.7):
 * gatherSignals() is genuinely wired to real data; the "future AI"
 * methods below are rule-based placeholders standing in for what a
 * real model would produce, clearly labeled as such.
 *
 * Note: search behavior isn't tracked anywhere in this schema yet
 * (AnalyticsEventType has no SEARCH event) — left out of signals
 * honestly rather than faked.
 */
export interface CustomerSignals {
  userId: string;
  viewedProductIds: string[];
  cartAddedProductIds: string[];
  purchasedProductIds: string[];
  favoritedProductIds: string[];
  daysSinceLastOrder: number | null;
  totalOrders: number;
}

export interface NextBestProductSuggestion {
  productId: string;
  reason: string;
}

export class CustomerBehaviorEngine {
  static async gatherSignals(userId: string): Promise<CustomerSignals> {
    const [viewEvents, cartEvents, orders, favorites] = await Promise.all([
      prisma.analyticsEvent.findMany({ where: { userId, type: "PRODUCT_VIEW" }, select: { productId: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.analyticsEvent.findMany({ where: { userId, type: "ADD_TO_CART" }, select: { productId: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true, supplierOrders: { select: { items: { select: { productId: true } } } } } }),
      prisma.favorite.findMany({ where: { userId }, select: { productId: true } }),
    ]);

    const purchasedProductIds = orders.flatMap((o) => o.supplierOrders.flatMap((so) => so.items.map((i) => i.productId)));
    const daysSinceLastOrder = orders.length > 0
      ? Math.floor((Date.now() - orders[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      userId,
      viewedProductIds: viewEvents.map((e) => e.productId).filter((id): id is string => !!id),
      cartAddedProductIds: cartEvents.map((e) => e.productId).filter((id): id is string => !!id),
      purchasedProductIds,
      favoritedProductIds: favorites.map((f) => f.productId),
      daysSinceLastOrder,
      totalOrders: orders.length,
    };
  }

  /**
   * PLACEHOLDER LOGIC, not a real model — see class doc comment.
   * Rule: viewed or favorited but never purchased = a genuine "next
   * best" candidate.
   */
  static async getNextBestProducts(userId: string, limit = 5): Promise<NextBestProductSuggestion[]> {
    const signals = await this.gatherSignals(userId);
    const purchasedSet = new Set(signals.purchasedProductIds);

    const candidates = [...new Set([...signals.viewedProductIds, ...signals.favoritedProductIds, ...signals.cartAddedProductIds])]
      .filter((id) => !purchasedSet.has(id));

    return candidates.slice(0, limit).map((productId) => ({
      productId,
      reason: signals.favoritedProductIds.includes(productId)
        ? "Favorited but not yet purchased"
        : signals.cartAddedProductIds.includes(productId)
        ? "Added to cart but not yet purchased"
        : "Viewed recently",
    }));
  }

  /**
   * PLACEHOLDER LOGIC, not a real churn model. Rule: an active customer
   * (2+ past orders) with no order in 45+ days is flagged "at risk".
   */
  static async getChurnRiskLevel(userId: string): Promise<"LOW" | "MEDIUM" | "HIGH"> {
    const signals = await this.gatherSignals(userId);
    if (signals.totalOrders === 0) return "LOW";
    if (signals.daysSinceLastOrder === null) return "LOW";
    if (signals.totalOrders >= 2 && signals.daysSinceLastOrder > 45) return "HIGH";
    if (signals.daysSinceLastOrder > 30) return "MEDIUM";
    return "LOW";
  }
}
