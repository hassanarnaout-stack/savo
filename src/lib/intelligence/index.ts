/**
 * ============================================================
 * SAVEO INTELLIGENCE CORE
 * ============================================================
 * The foundation layer every future Saveo intelligence feature
 * will build on. Eight independent engines, each reading real
 * platform data and returning the same explainable JSON shape
 * (see ./types.ts). No AI model anywhere in this layer — every
 * number is a deterministic calculation over real Prisma rows,
 * and every score ships with a `reason[]` array naming exactly
 * which real numbers produced it.
 *
 * ADDITIVE ONLY: nothing in this directory is imported by any
 * existing route, page, or service. This layer can be deleted
 * entirely with zero effect on the rest of the platform.
 *
 * Usage:
 *   import { computeProductIntelligence } from "@/lib/intelligence";
 *   const result = await computeProductIntelligence(productId);
 *   // result: { score, confidence, reason: string[], lastUpdated }
 * ============================================================
 */

export * from "./types";

export { computeCustomerIntelligence } from "./customer-intelligence-engine";
export { computeProductIntelligence } from "./product-intelligence-engine";
export { computeBrandIntelligence } from "./brand-intelligence-engine";
export { computeSupplierIntelligence } from "./supplier-intelligence-engine";
export { computeCategoryIntelligence } from "./category-intelligence-engine";
export { computeCampaignIntelligence } from "./campaign-intelligence-engine";
export { computeOrderIntelligence } from "./order-intelligence-engine";
export { computePricingIntelligence } from "./pricing-intelligence-engine";
