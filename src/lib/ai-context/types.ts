/**
 * ============================================================
 * SAVEO AI CONTEXT BUILDER — Shared Types
 * ============================================================
 * ADDITIVE ONLY. Assembles a unified, safe Context Object
 * entirely from Phase 3 (intelligence-access) functions — never
 * queries Prisma directly, never re-implements Data Warehouse
 * aggregation or Intelligence Core scoring.
 *
 * NO LLM ANYWHERE IN THIS LAYER. Intent detection is rule-based
 * string parsing, not a model call.
 * ============================================================
 */

export type IntentType =
  | "PRODUCT_SEARCH"
  | "PRODUCT_COMPARISON"
  | "BRAND_SEARCH"
  | "CATEGORY_SEARCH"
  | "GIFT"
  | "BUDGET_SHOPPING"
  | "CART_OPTIMIZATION"
  | "DEAL_DISCOVERY"
  | "REORDER"
  | "SUBSCRIPTION"
  | "ORDER_HELP"
  | "GENERAL_SHOPPING"
  | "UNKNOWN";

export interface ParsedIntent {
  intent: IntentType;
  category: string | null;
  budget: number | null;
  brand: string | null;
  isGift: boolean;
  /** Migrated from the legacy ShoppingAssistantService's wantsDiscount detection. */
  wantsDiscount: boolean;
  /** Migrated from the legacy ShoppingAssistantService's wantsMembersOnly detection. */
  wantsMembersOnly: boolean;
  /** Migrated from the legacy ShoppingAssistantService's dietTags detection — real Product.nutritionFact.dietTags values (VEGAN, KETO_FRIENDLY, etc.), never invented tags. */
  dietTags: string[];
  rawQuery: string;
}

export interface ContextMetadata {
  contextVersion: string;
  generatedAt: string;
  dataFreshness: { source: string; ageMs: number | null }[];
  sources: string[];
}

export interface CustomerContext {
  customerId: string;
  customerScore: number;
  purchaseFrequency: number | null;
  favoriteCategories: string[];
  favoriteBrands: string[];
  recentPurchaseSummary: { totalOrders: number; totalSpent: number; lastOrderAt: string | null };
  purchaseTrend: string;
}

export interface ProductContext {
  productId: string;
  productName: string;
  category: string | null;
  brand: string | null;
  price: number;
  available: boolean;
  rating: number | null;
  reviewCount: number;
  demandScore: number | null;
  productScore: number | null;
  returnRisk: string | null;
  relevantAlternatives: { productId: string; productName: string; price: number }[];
  activePromotions: string[];
}

export interface BrandContext {
  brandId: string;
  brandName: string;
  brandScore: number | null;
  popularProducts: { productId: string; productName: string }[];
  customerInterest: number | null;
  activePromotions: string[];
}

export interface CategoryContext {
  categoryId: string;
  categoryName: string;
  categoryScore: number | null;
  demand: number | null;
  topProducts: { productId: string; productName: string }[];
  popularBrands: string[];
  relevantDeals: string[];
}

export interface CartContext {
  items: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discount: number | null;
  deliveryFee: number | null;
  total: number;
  missingAmountForFreeDelivery: number | null;
}

export interface PromotionContext {
  activeCampaigns: { id: string; name: string; description: string | null }[];
  flashDeals: { id: string; name: string; description: string | null }[];
  dealsOfHour: { id: string; name: string }[];
  coupons: { id: string; name: string; description: string | null }[];
}

export interface MembershipContext {
  isActive: boolean;
  tier: string | null;
  freeDeliveryEligible: boolean;
  extraDiscountPercent: number | null;
}

export interface LoyaltyContext {
  pointsBalance: number;
  lifetimePoints: number;
}

export interface WalletContext {
  balance: number;
}

export interface OrderContext {
  recentOrders: { orderId: string; orderNumber: string; status: string; total: number; createdAt: string }[];
}

export interface RecommendationContext {
  items: { productId: string; productName: string; slug: string; price: number; originalPrice: number; image: string | null; stockQty: number; reason: string }[];
}

export interface SaveoAIContext {
  metadata: ContextMetadata;
  intent: ParsedIntent;
  customer?: CustomerContext;
  product?: ProductContext;
  brand?: BrandContext;
  category?: CategoryContext;
  cart?: CartContext;
  promotions?: PromotionContext;
  membership?: MembershipContext;
  loyalty?: LoyaltyContext;
  wallet?: WalletContext;
  orders?: OrderContext;
  recommendations?: RecommendationContext;
}
