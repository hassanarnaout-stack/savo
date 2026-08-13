/**
 * ============================================================
 * SAVEO DATA WAREHOUSE
 * ============================================================
 * ADDITIVE ONLY. No Prisma Schema changes, no existing model
 * modified, no existing route/service touched. Nothing in this
 * directory is imported anywhere else in the platform today.
 *
 * Usage:
 *   import { refreshWarehouse, getCustomerSummary } from "@/lib/data-warehouse";
 *   await refreshWarehouse();                    // full rebuild
 *   const summary = getCustomerSummary(userId);   // instant cached read afterward
 *
 * See README.md for the full architecture and every genuinely-null field.
 * ============================================================
 */

export * from "./types";
export * from "./warehouse-cache";
export * from "./warehouse-service";
export * from "./warehouse-health";
export * from "./warehouse-validation";

export { buildCustomerSummaries, getCustomerSummary } from "./customer-summary";
export { buildProductSummaries, getProductSummary } from "./product-summary";
export { buildBrandSummaries, getBrandSummary } from "./brand-summary";
export { buildSupplierSummaries, getSupplierSummary } from "./supplier-summary";
export { buildCategorySummaries, getCategorySummary } from "./category-summary";
export { buildCampaignSummaries, getCampaignSummary } from "./campaign-summary";
export { buildOrderSummaries, getOrderSummary } from "./order-summary";
export { buildRevenueSummaries, getRevenueSummary } from "./revenue-summary";
