/**
 * ============================================================
 * SAVEO INTELLIGENCE DATA ACCESS LAYER
 * ============================================================
 * ADDITIVE ONLY, READ-ONLY. Sits between (Data Warehouse +
 * Intelligence Core + Application Data) and any future consumer
 * (Phase 4's AI Context Builder). Every customer-scoped function
 * enforces real ownership via assertOwnership() — see security.ts.
 *
 * Architecture:
 *   Application Data → Intelligence Core → Data Warehouse
 *   → THIS LAYER → Phase 4 (AI Context Builder) → future AI systems
 *
 * Usage:
 *   import { getProductIntelligence, getCustomerIntelligence } from "@/lib/intelligence-access";
 *   const product = await getProductIntelligence(productId);                          // public
 *   const customer = await getCustomerIntelligence(customerId, session.user.id);       // throws if session.user.id !== customerId
 *
 * See README.md for the full security model and test results.
 * ============================================================
 */

export * from "./types";
export * from "./security";
export * from "./access-cache";

export { getCustomerIntelligence, getCustomerOrderHistory, getPreviouslyPurchasedProducts } from "./customer-access";
export type { PreviouslyPurchasedProduct } from "./customer-access";
export { getWalletData, getLoyaltyData, getMembershipData } from "./wallet-loyalty-membership-access";
export { getCartIntelligence } from "./cart-access";
export { getProductIntelligence, searchRelevantProducts } from "./product-access";
export type { ProductSearchParams } from "./product-access";
export { getBrandIntelligence, getCategoryIntelligence } from "./brand-category-access";
export { getActivePromotions } from "./promotion-access";
export { getRelevantRecommendations } from "./recommendation-access";
