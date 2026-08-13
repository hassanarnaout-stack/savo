/**
 * AI CONTEXT BUILDER
 * ============================================================
 * The single entry point that assembles SaveoAIContext. Every
 * piece of business data comes from Phase 3 (intelligence-access)
 * — this file's only direct Prisma usage is intent-parser.ts's
 * real category/brand name lookup, which is Relevance Layer
 * matching, not business-data aggregation.
 *
 * Security: an anonymous request (no session) gets product/brand/
 * category/promotion context only — customer/cart/wallet/loyalty/
 * membership/orders are genuinely absent (undefined), never
 * populated with fake/empty data.
 * ============================================================
 */
import {
  getCustomerIntelligence, getCustomerOrderHistory,
  getWalletData, getLoyaltyData, getMembershipData,
  getCartIntelligence,
  getProductIntelligence, searchRelevantProducts,
  getBrandIntelligence, getCategoryIntelligence,
  getActivePromotions,
  getRelevantRecommendations,
} from "@/lib/intelligence-access";
import { parseIntent } from "./intent-parser";
import { logContextBuild, logContextBuildError } from "./audit-log";
import {
  SaveoAIContext, ContextMetadata, ProductContext, PromotionContext,
} from "./types";

const CONTEXT_VERSION = "1.0.0";

export interface BuildContextParams {
  query?: string;
  requestingUserId: string | null;
  productId?: string;
  brandName?: string;
  categoryId?: string;
}

async function buildPromotionContext(): Promise<{ context: PromotionContext; ageMs: number }> {
  const start = Date.now();
  const promos = await getActivePromotions(15);
  return {
    context: {
      activeCampaigns: promos.filter((p) => p.type === "CAMPAIGN").map((p) => ({ id: p.id, name: p.name, description: p.description })),
      flashDeals: promos.filter((p) => p.type === "FLASH_DEAL").map((p) => ({ id: p.id, name: p.name, description: p.description })),
      dealsOfHour: promos.filter((p) => p.type === "DEAL_OF_HOUR").map((p) => ({ id: p.id, name: p.name })),
      coupons: promos.filter((p) => p.type === "COUPON").map((p) => ({ id: p.id, name: p.name, description: p.description })),
    },
    ageMs: Date.now() - start,
  };
}

export async function buildContext(params: BuildContextParams): Promise<SaveoAIContext> {
  const start = Date.now();
  const sourcesUsed: string[] = [];
  const freshness: ContextMetadata["dataFreshness"] = [];
  const sectionsBuilt: string[] = [];

  try {
    const intent = params.query ? await parseIntent(params.query) : { intent: "UNKNOWN" as const, category: null, budget: null, brand: null, isGift: false, wantsDiscount: false, wantsMembersOnly: false, dietTags: [] as string[], rawQuery: "" };

    const context: SaveoAIContext = {
      metadata: { contextVersion: CONTEXT_VERSION, generatedAt: new Date().toISOString(), dataFreshness: [], sources: [] },
      intent,
    };

    // Customer-scoped sections — only built for a real authenticated
    // requester reading their OWN data (requestingUserId passed as both
    // the target and the requester to every Phase 3 call below).
    if (params.requestingUserId) {
      const uid = params.requestingUserId;

      const [customerIntel, cart, membership, loyalty, wallet, orderHistory, recs] = await Promise.all([
        getCustomerIntelligence(uid, uid).catch(() => null),
        getCartIntelligence(uid, uid).catch(() => null),
        getMembershipData(uid, uid).catch(() => null),
        getLoyaltyData(uid, uid).catch(() => null),
        getWalletData(uid, uid).catch(() => null),
        getCustomerOrderHistory(uid, uid, 5).catch(() => []),
        getRelevantRecommendations([], 6).catch(() => []),
      ]);

      if (customerIntel) {
        context.customer = {
          customerId: customerIntel.customerId,
          customerScore: customerIntel.customerScore,
          purchaseFrequency: customerIntel.purchaseFrequency,
          favoriteCategories: customerIntel.favoriteCategories.map((c) => c.categoryName),
          favoriteBrands: customerIntel.favoriteBrands,
          recentPurchaseSummary: customerIntel.recentPurchaseSummary,
          purchaseTrend: customerIntel.purchaseTrend,
        };
        sourcesUsed.push("CUSTOMER_DATA");
        freshness.push({ source: "CUSTOMER_DATA", ageMs: customerIntel.freshness.dataAgeMs });
        sectionsBuilt.push("customer");
      }

      if (cart) {
        context.cart = { items: cart.items, subtotal: cart.subtotal, discount: cart.discount, deliveryFee: cart.deliveryFee, total: cart.total, missingAmountForFreeDelivery: cart.missingAmountForFreeDelivery };
        sourcesUsed.push("CART_DATA");
        sectionsBuilt.push("cart");
      }

      if (membership) {
        context.membership = { isActive: membership.status === "ACTIVE", tier: membership.tier, freeDeliveryEligible: membership.freeDeliveryEligible, extraDiscountPercent: membership.extraDiscountPercent };
        sourcesUsed.push("MEMBERSHIP_DATA");
        sectionsBuilt.push("membership");
      }

      if (loyalty) {
        context.loyalty = { pointsBalance: loyalty.pointsBalance, lifetimePoints: loyalty.lifetimePoints };
        sourcesUsed.push("LOYALTY_DATA");
        sectionsBuilt.push("loyalty");
      }

      if (wallet) {
        context.wallet = { balance: wallet.balance };
        sourcesUsed.push("WALLET_DATA");
        sectionsBuilt.push("wallet");
      }

      if (orderHistory.length > 0) {
        context.orders = { recentOrders: orderHistory };
        sourcesUsed.push("ORDER_DATA");
        sectionsBuilt.push("orders");
      }

      if (recs.length > 0) {
        context.recommendations = { items: recs };
        sourcesUsed.push("RECOMMENDATION_DATA");
        sectionsBuilt.push("recommendations");
      }
    }

    if (params.productId) {
      const product = await getProductIntelligence(params.productId);
      if (product) {
        const alternatives = product.category
          ? (await searchRelevantProducts({ category: product.category, limit: 4 })).filter((p) => p.productId !== product.productId).slice(0, 3)
          : [];
        const productContext: ProductContext = {
          productId: product.productId,
          productName: product.productName,
          category: product.category,
          brand: product.brand,
          price: product.price,
          available: product.available,
          rating: product.rating,
          reviewCount: product.reviewCount,
          demandScore: product.demandScore,
          productScore: product.productScore,
          returnRisk: product.returnRisk,
          relevantAlternatives: alternatives.map((a) => ({ productId: a.productId, productName: a.productName, price: a.price })),
          activePromotions: [],
        };
        context.product = productContext;
        sourcesUsed.push("PRODUCT_DATA");
        freshness.push({ source: "PRODUCT_DATA", ageMs: product.freshness.dataAgeMs });
        sectionsBuilt.push("product");
      }
    }

    if (params.brandName) {
      const brand = await getBrandIntelligence(params.brandName);
      if (brand) {
        context.brand = { brandId: brand.brandId, brandName: brand.brandName, brandScore: brand.brandScore, popularProducts: brand.popularProducts, customerInterest: brand.customerInterest, activePromotions: [] };
        sourcesUsed.push("DATA_WAREHOUSE");
        sectionsBuilt.push("brand");
      }
    }

    if (params.categoryId) {
      const category = await getCategoryIntelligence(params.categoryId);
      if (category) {
        context.category = { categoryId: category.categoryId, categoryName: category.categoryName, categoryScore: category.categoryScore, demand: category.demand, topProducts: category.popularProducts, popularBrands: category.popularBrands, relevantDeals: [] };
        sourcesUsed.push("DATA_WAREHOUSE");
        sectionsBuilt.push("category");
      }
    }

    const { context: promoContext, ageMs } = await buildPromotionContext();
    context.promotions = promoContext;
    sourcesUsed.push("PROMOTION_DATA");
    freshness.push({ source: "PROMOTION_DATA", ageMs });
    sectionsBuilt.push("promotions");

    context.metadata.sources = [...new Set(sourcesUsed)];
    context.metadata.dataFreshness = freshness;

    logContextBuild({ requestingUserId: params.requestingUserId, intent: intent.intent, sectionsBuilt, durationMs: Date.now() - start, timestamp: new Date().toISOString() });

    return context;
  } catch (err) {
    // Real failure safety: logged and rethrown, never swallowed into a
    // fake empty context that would look like a valid "nothing found"
    // result to whatever calls this.
    logContextBuildError(params.requestingUserId, err);
    throw err;
  }
}
