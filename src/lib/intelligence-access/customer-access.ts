/**
 * CUSTOMER ACCESS
 * ============================================================
 * Reads the CustomerSummary already computed by the Data
 * Warehouse — never re-runs Order aggregation. Falls back to ONE
 * minimal real Order query if the warehouse hasn't been refreshed
 * yet, never to invented numbers.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { getCustomerSummary } from "@/lib/data-warehouse";
import { assertOwnership } from "./security";
import { CustomerIntelligenceData, OrderHistoryItem, DataFreshness } from "./types";

function trendFromSummary(totalOrders: number, daysSinceLastOrder: number | null, purchaseFrequency: number | null): CustomerIntelligenceData["purchaseTrend"] {
  if (totalOrders === 0) return "NEW";
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 90) return "INACTIVE";
  if (purchaseFrequency === null) return "STABLE";
  if (purchaseFrequency >= 2) return "GROWING";
  if (purchaseFrequency < 0.5) return "DECLINING";
  return "STABLE";
}

export async function getCustomerIntelligence(customerId: string, requestingUserId: string | null): Promise<CustomerIntelligenceData> {
  assertOwnership(requestingUserId, customerId, "customer intelligence");

  const warehouseSummary = getCustomerSummary(customerId);

  const freshness: DataFreshness = warehouseSummary
    ? { source: "DATA_WAREHOUSE", generatedAt: warehouseSummary.lastUpdated, dataAgeMs: Date.now() - new Date(warehouseSummary.lastUpdated).getTime() }
    : { source: "CUSTOMER_DATA", generatedAt: new Date().toISOString(), dataAgeMs: 0 };

  if (warehouseSummary) {
    return {
      customerId,
      customerScore: warehouseSummary.customerScore,
      purchaseFrequency: warehouseSummary.purchaseFrequency,
      favoriteCategories: warehouseSummary.favoriteCategories.map((c) => ({ categoryId: c.categoryId, categoryName: c.categoryName })),
      favoriteBrands: warehouseSummary.favoriteBrands.map((b) => b.brandName),
      recentPurchaseSummary: {
        totalOrders: warehouseSummary.totalOrders,
        totalSpent: warehouseSummary.totalSpent,
        lastOrderAt: warehouseSummary.lastOrderAt,
      },
      purchaseTrend: trendFromSummary(warehouseSummary.totalOrders, warehouseSummary.daysSinceLastOrder, warehouseSummary.purchaseFrequency),
      freshness,
    };
  }

  const orders = await prisma.order.findMany({
    where: { userId: customerId, status: { not: "CANCELLED" } },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);

  return {
    customerId,
    customerScore: 0,
    purchaseFrequency: null,
    favoriteCategories: [],
    favoriteBrands: [],
    recentPurchaseSummary: { totalOrders: orders.length, totalSpent: Number(totalSpent.toFixed(3)), lastOrderAt: orders[0]?.createdAt.toISOString() ?? null },
    purchaseTrend: orders.length === 0 ? "NEW" : "STABLE",
    freshness,
  };
}

export async function getCustomerOrderHistory(customerId: string, requestingUserId: string | null, limit = 20): Promise<OrderHistoryItem[]> {
  assertOwnership(requestingUserId, customerId, "order history");

  const boundedLimit = Math.min(Math.max(limit, 1), 50);

  const orders = await prisma.order.findMany({
    where: { userId: customerId },
    orderBy: { createdAt: "desc" },
    take: boundedLimit,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      supplierOrders: { select: { items: { select: { quantity: true } } } },
    },
  });

  return orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: Number(o.total),
    itemCount: o.supplierOrders.reduce((sum, so) => sum + so.items.reduce((s, i) => s + i.quantity, 0), 0),
    createdAt: o.createdAt.toISOString(),
  }));
}

export interface PreviouslyPurchasedProduct {
  productId: string;
  productName: string;
  slug: string;
  lastPurchasedAt: string;
  suggestedQuantity: number;
  timesPurchased: number;
  currentPrice: number;
  currentlyAvailable: boolean;
  image: string | null;
}

/**
 * Real REORDER data source: scans this customer's actual delivered
 * orders' real OrderItem rows, groups by product, and returns each
 * distinct product with its REAL last-purchase date, REAL average
 * quantity, and REAL current price/availability.
 */
export async function getPreviouslyPurchasedProducts(customerId: string, requestingUserId: string | null, limit = 10): Promise<PreviouslyPurchasedProduct[]> {
  assertOwnership(requestingUserId, customerId, "purchase history");
  const boundedLimit = Math.min(Math.max(limit, 1), 20);

  const items = await prisma.orderItem.findMany({
    where: { supplierOrder: { order: { userId: customerId, status: "DELIVERED" } } },
    select: {
      productId: true, quantity: true,
      supplierOrder: { select: { order: { select: { createdAt: true } } } },
    },
    orderBy: { supplierOrder: { order: { createdAt: "desc" } } },
  });

  interface Agg { lastPurchasedAt: Date; totalQty: number; orderCount: number; }
  const byProduct = new Map<string, Agg>();
  for (const item of items) {
    const orderDate = item.supplierOrder.order.createdAt;
    const existing = byProduct.get(item.productId);
    if (!existing) {
      byProduct.set(item.productId, { lastPurchasedAt: orderDate, totalQty: item.quantity, orderCount: 1 });
    } else {
      existing.totalQty += item.quantity;
      existing.orderCount += 1;
      if (orderDate > existing.lastPurchasedAt) existing.lastPurchasedAt = orderDate;
    }
  }

  const sortedProductIds = Array.from(byProduct.entries())
    .sort((a, b) => b[1].lastPurchasedAt.getTime() - a[1].lastPurchasedAt.getTime())
    .slice(0, boundedLimit)
    .map(([id]) => id);

  if (sortedProductIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: sortedProductIds } },
    select: { id: true, name: true, slug: true, saveoPrice: true, status: true, stockQty: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  return sortedProductIds
    .map((id): PreviouslyPurchasedProduct | null => {
      const agg = byProduct.get(id)!;
      const product = productById.get(id);
      if (!product) return null;
      return {
        productId: id,
        productName: product.name,
        slug: product.slug,
        lastPurchasedAt: agg.lastPurchasedAt.toISOString(),
        suggestedQuantity: Math.max(1, Math.round(agg.totalQty / agg.orderCount)),
        timesPurchased: agg.orderCount,
        currentPrice: Number(product.saveoPrice),
        currentlyAvailable: product.status === "ACTIVE" && product.stockQty > 0,
        image: product.images[0]?.url ?? null,
      };
    })
    .filter((p): p is PreviouslyPurchasedProduct => p !== null);
}
