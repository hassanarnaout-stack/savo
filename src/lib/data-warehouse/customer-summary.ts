/**
 * CUSTOMER SUMMARY
 * ============================================================
 * Pre-computation strategy: ONE bulk Order query (with items/products
 * included) covering every customer at once, aggregated in memory —
 * not N+1 per-customer queries.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { CustomerSummary, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

interface OrderRow {
  userId: string;
  total: unknown;
  status: string;
  createdAt: Date;
  isMembershipOrder: boolean;
  discountTotal: unknown;
  supplierOrders: {
    items: {
      productId: string;
      quantity: number;
      product: { name: string; categoryId: string; brandName: string | null; category: { name: string } };
    }[];
  }[];
}

export async function buildCustomerSummaries(): Promise<{ summaries: CustomerSummary[]; stats: BuildStats }> {
  const start = Date.now();
  let queryCount = 0;

  const [orders, returnRequests, memberships, points, wallets, userMeta] = await Promise.all([
    prisma.order.findMany({
      select: {
        userId: true, total: true, status: true, createdAt: true, isMembershipOrder: true, discountTotal: true,
        supplierOrders: { select: { items: { select: { productId: true, quantity: true, product: { select: { name: true, categoryId: true, brandName: true, category: { select: { name: true } } } } } } } },
      },
    }).then((r) => { queryCount++; return r as unknown as OrderRow[]; }),
    prisma.returnRequest.findMany({ select: { userId: true } }).then((r) => { queryCount++; return r; }),
    prisma.membership.findMany({ select: { userId: true, status: true } }).then((r) => { queryCount++; return r; }),
    prisma.saveoPoints.findMany({ select: { userId: true, points: true } }).then((r) => { queryCount++; return r; }),
    prisma.saveoWallet.findMany({ select: { userId: true, balance: true } }).then((r) => { queryCount++; return r; }),
    prisma.user.findMany({ select: { id: true, createdAt: true } }).then((r) => { queryCount++; return r; }),
  ]);

  const returnedByUser = new Map<string, number>();
  for (const r of returnRequests) returnedByUser.set(r.userId, (returnedByUser.get(r.userId) ?? 0) + 1);

  const membershipByUser = new Map(memberships.map((m) => [m.userId, m.status]));
  const pointsByUser = new Map(points.map((p) => [p.userId, p.points]));
  const walletByUser = new Map(wallets.map((w) => [w.userId, Number(w.balance)]));
  const signupByUser = new Map(userMeta.map((u) => [u.id, u.createdAt]));

  const ordersByUser = new Map<string, OrderRow[]>();
  for (const o of orders) {
    if (!ordersByUser.has(o.userId)) ordersByUser.set(o.userId, []);
    ordersByUser.get(o.userId)!.push(o);
  }

  const summaries: CustomerSummary[] = [];
  const now = Date.now();

  for (const [customerId, custOrders] of ordersByUser) {
    const nonCancelled = custOrders.filter((o) => o.status !== "CANCELLED");
    const completed = custOrders.filter((o) => o.status === "DELIVERED");
    const cancelled = custOrders.filter((o) => o.status === "CANCELLED");
    const totalSpent = nonCancelled.reduce((s, o) => s + Number(o.total), 0);
    const avgOrderValue = nonCancelled.length > 0 ? totalSpent / nonCancelled.length : 0;

    const sorted = [...custOrders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const lastOrderAt = sorted[0]?.createdAt ?? null;
    const daysSinceLastOrder = lastOrderAt ? Math.floor((now - lastOrderAt.getTime()) / 86400000) : null;

    const signupAt = signupByUser.get(customerId);
    const monthsSinceSignup = signupAt ? Math.max(1, (now - signupAt.getTime()) / (30 * 86400000)) : null;
    const purchaseFrequency = monthsSinceSignup && nonCancelled.length > 0 ? Number((nonCancelled.length / monthsSinceSignup).toFixed(2)) : null;

    const categoryCounts = new Map<string, { name: string; count: number }>();
    const brandCounts = new Map<string, number>();
    const productCounts = new Map<string, { name: string; count: number }>();

    for (const o of nonCancelled) {
      for (const so of o.supplierOrders) {
        for (const item of so.items) {
          const cat = categoryCounts.get(item.product.categoryId) ?? { name: item.product.category.name, count: 0 };
          cat.count += 1;
          categoryCounts.set(item.product.categoryId, cat);

          if (item.product.brandName) {
            brandCounts.set(item.product.brandName, (brandCounts.get(item.product.brandName) ?? 0) + 1);
          }

          const prod = productCounts.get(item.productId) ?? { name: item.product.name, count: 0 };
          prod.count += 1;
          productCounts.set(item.productId, prod);
        }
      }
    }

    // APPROXIMATION, documented honestly: Order.discountTotal is the
    // COMBINED discount (coupons + membership extra discount together —
    // see checkout/route.ts's `originalTotal - subtotal + membershipExtraDiscount`),
    // not a membership-only figure. This slightly overstates membershipValue
    // on orders that also used a coupon. No cleaner real field exists today
    // to isolate membership's exact share — see README.md.
    const membershipStatus = membershipByUser.get(customerId) ?? null;
    const membershipValue = membershipStatus
      ? nonCancelled.filter((o) => o.isMembershipOrder).reduce((s, o) => s + Number(o.discountTotal), 0)
      : null;

    const recencyPart = daysSinceLastOrder !== null ? Math.max(0, 100 - (daysSinceLastOrder / 90) * 100) : 0;
    const frequencyPart = Math.min(nonCancelled.length, 10) * 10;
    const monetaryPart = Math.min(totalSpent, 500) / 5;
    const customerScore = Math.round(Math.max(0, Math.min(100, recencyPart * 0.35 + frequencyPart * 0.35 + monetaryPart * 0.3)));

    summaries.push({
      customerId,
      totalOrders: custOrders.length,
      completedOrders: completed.length,
      cancelledOrders: cancelled.length,
      returnedOrders: returnedByUser.get(customerId) ?? 0,
      totalSpent: Number(totalSpent.toFixed(3)),
      averageOrderValue: Number(avgOrderValue.toFixed(3)),
      lastOrderAt: lastOrderAt ? lastOrderAt.toISOString() : null,
      daysSinceLastOrder,
      purchaseFrequency,
      favoriteCategories: Array.from(categoryCounts.entries())
        .map(([categoryId, v]) => ({ categoryId, categoryName: v.name, orderCount: v.count }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5),
      favoriteBrands: Array.from(brandCounts.entries())
        .map(([brandName, orderCount]) => ({ brandName, orderCount }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5),
      favoriteProducts: Array.from(productCounts.entries())
        .map(([productId, v]) => ({ productId, productName: v.name, orderCount: v.count }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5),
      membershipStatus,
      membershipValue: membershipValue !== null ? Number(membershipValue.toFixed(3)) : null,
      loyaltyPoints: pointsByUser.get(customerId) ?? null,
      walletBalance: walletByUser.get(customerId) ?? null,
      lifetimeValue: Number(totalSpent.toFixed(3)),
      customerScore,
      lastUpdated: new Date().toISOString(),
    });
  }

  const stats: BuildStats = { recordsProcessed: summaries.length, queryCount, durationMs: Date.now() - start };

  for (const s of summaries) {
    warehouseCache.set(cacheKey("customer", s.customerId), s, stats);
  }

  return { summaries, stats };
}

export function getCustomerSummary(customerId: string): CustomerSummary | null {
  return warehouseCache.get<CustomerSummary>(cacheKey("customer", customerId));
}
