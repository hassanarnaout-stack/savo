/**
 * ============================================================
 * SAVEO INTELLIGENCE DATA ACCESS LAYER — Shared Types
 * ============================================================
 * ADDITIVE ONLY. Read-only access layer between (Data Warehouse +
 * Intelligence Core + raw Application Data) and any future
 * consumer (Phase 4's AI Context Builder). Re-uses existing
 * computations — never re-implements Intelligence Core scoring
 * or Data Warehouse aggregation.
 *
 * SECURITY BOUNDARY: every type below is the exact allowlist of
 * fields a consumer is permitted to see. Internal fields (cost,
 * commission, margin, supplier identity, admin-only scores) are
 * structurally absent — not filtered at runtime, but not present
 * in the type at all.
 * ============================================================
 */

export type DataSource =
  | "DATA_WAREHOUSE"
  | "INTELLIGENCE_CORE"
  | "PRODUCT_DATA"
  | "CUSTOMER_DATA"
  | "PROMOTION_DATA"
  | "CART_DATA"
  | "MEMBERSHIP_DATA"
  | "LOYALTY_DATA"
  | "WALLET_DATA"
  | "ORDER_DATA"
  | "RECOMMENDATION_DATA";

export interface DataFreshness {
  source: DataSource;
  generatedAt: string;
  dataAgeMs: number | null;
}

export interface CustomerIntelligenceData {
  customerId: string;
  customerScore: number;
  purchaseFrequency: number | null;
  favoriteCategories: { categoryId: string; categoryName: string }[];
  favoriteBrands: string[];
  recentPurchaseSummary: { totalOrders: number; totalSpent: number; lastOrderAt: string | null };
  purchaseTrend: "GROWING" | "STABLE" | "DECLINING" | "NEW" | "INACTIVE";
  freshness: DataFreshness;
}

export interface ProductIntelligenceData {
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
  returnRisk: "LOW" | "MEDIUM" | "HIGH" | null;
  freshness: DataFreshness;
}

export interface ProductSearchResultItem {
  productId: string;
  productName: string;
  slug: string;
  price: number;
  originalPrice: number;
  image: string | null;
  stockQty: number;
  category: string;
  brand: string | null;
  rating: number | null;
  hasActiveDeal: boolean;
}

export interface BrandIntelligenceData {
  brandId: string;
  brandName: string;
  brandScore: number | null;
  popularProducts: { productId: string; productName: string }[];
  customerInterest: number | null;
  category: null;
  freshness: DataFreshness;
}

export interface CategoryIntelligenceData {
  categoryId: string;
  categoryName: string;
  categoryScore: number | null;
  demand: number | null;
  popularProducts: { productId: string; productName: string }[];
  popularBrands: string[];
  trend: "GROWING" | "STABLE" | "DECLINING" | null;
  freshness: DataFreshness;
}

export interface PromotionSummary {
  id: string;
  name: string;
  type: "CAMPAIGN" | "FLASH_DEAL" | "DEAL_OF_HOUR" | "COUPON" | "MEMBERSHIP_OFFER";
  description: string | null;
  endsAt: string | null;
}

export interface CartLineIntelligence {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartIntelligenceData {
  customerId: string;
  items: CartLineIntelligence[];
  subtotal: number;
  discount: number | null;
  deliveryFee: number | null;
  total: number;
  missingAmountForFreeDelivery: number | null;
  freshness: DataFreshness;
}

export interface MembershipData {
  customerId: string;
  status: string | null;
  tier: string | null;
  freeDeliveryEligible: boolean;
  extraDiscountPercent: number | null;
  freshness: DataFreshness;
}

export interface LoyaltyData {
  customerId: string;
  pointsBalance: number;
  lifetimePoints: number;
  freshness: DataFreshness;
}

export interface WalletData {
  customerId: string;
  balance: number;
  freshness: DataFreshness;
}

export interface OrderHistoryItem {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

export interface RecommendationItem {
  productId: string;
  productName: string;
  slug: string;
  price: number;
  originalPrice: number;
  image: string | null;
  stockQty: number;
  reason: string;
}

export class AccessDeniedError extends Error {
  constructor(resource: string) {
    super(`Access denied: requester is not authorized to read this ${resource}.`);
    this.name = "AccessDeniedError";
  }
}
