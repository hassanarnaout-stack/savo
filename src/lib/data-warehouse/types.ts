/**
 * ============================================================
 * SAVEO DATA WAREHOUSE — Shared Types
 * ============================================================
 * ADDITIVE ONLY. Nothing here touches Prisma Schema, existing
 * services, or existing routes. This layer pre-computes real
 * aggregations that would otherwise mean dozens of Prisma calls
 * per request, and caches them in-process (see warehouse-cache.ts)
 * so repeated reads don't re-run the heavy aggregation.
 *
 * ZERO INVENTED DATA: every field below that this platform
 * doesn't actually track yet is explicitly typed as nullable and
 * is genuinely returned as `null` by the builders — never a fake
 * placeholder number. See README.md for which fields are real
 * today vs. genuinely unavailable.
 * ============================================================
 */

export interface CustomerSummary {
  customerId: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  purchaseFrequency: number | null;
  favoriteCategories: { categoryId: string; categoryName: string; orderCount: number }[];
  favoriteBrands: { brandName: string; orderCount: number }[];
  favoriteProducts: { productId: string; productName: string; orderCount: number }[];
  membershipStatus: string | null;
  membershipValue: number | null;
  loyaltyPoints: number | null;
  walletBalance: number | null;
  lifetimeValue: number;
  customerScore: number;
  lastUpdated: string;
}

export interface ProductSummary {
  productId: string;
  productName: string;
  categoryId: string | null;
  brandId: string | null;
  supplierCount: number;
  unitsSold: number;
  ordersCount: number;
  revenue: number;
  averageSellingPrice: number | null;
  averageRating: number | null;
  reviewCount: number;
  returnRate: number | null;
  cancellationRate: number | null;
  conversionRate: null;
  stockStatus: string;
  demandScore: number;
  productScore: number;
  lastUpdated: string;
}

export interface BrandSummary {
  brandId: string;
  brandName: string;
  productCount: number;
  unitsSold: number;
  ordersCount: number;
  revenue: number;
  averageProductRating: number | null;
  returnRate: number | null;
  customerCount: number;
  repeatPurchaseRate: number | null;
  brandScore: number;
  lastUpdated: string;
}

export interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  productCount: number;
  ordersCount: number;
  completedOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  grossSales: number;
  realizedSales: number;
  commission: number;
  netPayable: number;
  averageOrderValue: number | null;
  completionRate: number | null;
  cancellationRate: number | null;
  returnRate: number | null;
  supplierScore: number;
  lastUpdated: string;
}

export interface CampaignSummary {
  campaignId: string;
  views: number | null;
  interactions: number | null;
  plays: number | null;
  clicks: null;
  cartAdds: null;
  purchases: number | null;
  revenue: number | null;
  conversionRate: number | null;
  roi: null;
  campaignScore: number;
  lastUpdated: string;
}

export interface OrderSummaryPeriod {
  date: string;
  granularity: "DAILY" | "WEEKLY" | "MONTHLY";
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  returnedOrders: number;
  grossSales: number;
  realizedSales: number;
  commission: number;
  netSales: number;
  averageOrderValue: number | null;
  itemsSold: number;
  supplierOrders: number;
  lastUpdated: string;
}

export interface RevenueSummaryPeriod {
  date: string;
  granularity: "DAILY" | "WEEKLY" | "MONTHLY";
  grossSales: number;
  realizedSales: number;
  refunds: number;
  commissions: number;
  supplierPayables: number;
  saveoRevenue: number;
  netRevenue: number;
  orders: number;
  averageOrderValue: number | null;
  lastUpdated: string;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  productCount: number;
  unitsSold: number;
  ordersCount: number;
  revenue: number;
  averageOrderValue: number | null;
  averageRating: number | null;
  returnRate: number | null;
  growthRate: number | null;
  demandScore: number;
  categoryScore: number;
  lastUpdated: string;
}

export interface BuildStats {
  recordsProcessed: number;
  queryCount: number;
  durationMs: number;
}
