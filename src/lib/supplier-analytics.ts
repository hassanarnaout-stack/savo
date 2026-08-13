import { prisma } from "@/lib/prisma";
import { getStockStatus } from "@/lib/inventory";
import type { SupplierTransactionStatus } from "@prisma/client";

/**
 * Every function here takes `supplierId` resolved server-side from the
 * session (via requireVerifiedSupplier/getSupplierAccountGate) — callers
 * must never pass through a client-supplied id.
 *
 * TWO DISTINCT FINANCIAL CONCEPTS — do not conflate them:
 *
 *   GMV (Gross Merchandise Value)
 *     - Counted the moment an order is PLACED (SupplierTransaction status
 *       PENDING, COMPLETED, or SETTLED — anything not REVERSED).
 *     - Measures platform/supplier ACTIVITY, not money owed.
 *     - Excludes cancelled orders.
 *
 *   Realized Sales (a.k.a. Completed Sales / Realized Revenue)
 *     - Counted only once the SupplierOrder is DELIVERED
 *       (SupplierTransaction status COMPLETED or SETTLED).
 *     - This is the ONLY figure that drives Supplier Earnings, Saveo
 *       Commission, Settlement, and Net Profit — an undelivered order is
 *       never treated as a completed sale.
 *
 * SupplierTransaction.status lifecycle:
 *   PENDING (order placed) -> COMPLETED (delivered) -> SETTLED (paid out)
 *   PENDING (order placed) -> REVERSED (cancelled, pre-delivery only)
 */

const GMV_FILTER = { status: { not: "REVERSED" as const } };
const REALIZED_STATUSES: SupplierTransactionStatus[] = ["COMPLETED", "SETTLED"];
const REALIZED_FILTER = { status: { in: REALIZED_STATUSES } };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface SupplierKPIs {
  // Activity metrics (GMV-based — counted at order time, excludes cancelled)
  todaySales: number;
  yesterdaySales: number;
  monthlySales: number;
  ordersToday: number;
  ordersThisMonth: number;
  averageOrderValue: number;
  gmv: number;
  // Financial metrics (Realized-Sales-based — counted only at DELIVERED)
  realizedSales: number;
  commissionPaid: number;
  commissionPending: number;
  netEarnings: number;
  // Catalog
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export async function getSupplierKPIs(supplierId: string): Promise<SupplierKPIs> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = startOfMonth(now);

  const [
    todayAgg,
    yesterdayAgg,
    monthAgg,
    gmvAgg,
    realizedAgg,
    settledAgg,
    completedAgg,
    ordersTodayCount,
    ordersMonthCount,
    productCounts,
    stockRows,
  ] = await Promise.all([
    // Activity (GMV) — counted at order time, excludes REVERSED only
    prisma.supplierTransaction.aggregate({
      where: { supplierId, ...GMV_FILTER, createdAt: { gte: todayStart } },
      _sum: { saleAmount: true },
    }),
    prisma.supplierTransaction.aggregate({
      where: { supplierId, ...GMV_FILTER, createdAt: { gte: yesterdayStart, lt: todayStart } },
      _sum: { saleAmount: true },
    }),
    prisma.supplierTransaction.aggregate({
      where: { supplierId, ...GMV_FILTER, createdAt: { gte: monthStart } },
      _sum: { saleAmount: true },
    }),
    prisma.supplierTransaction.aggregate({
      where: { supplierId, ...GMV_FILTER },
      _sum: { saleAmount: true },
      _count: true,
    }),
    // Realized (delivered-only) — drives every money-owed figure
    prisma.supplierTransaction.aggregate({
      where: { supplierId, ...REALIZED_FILTER },
      _sum: { saleAmount: true, supplierAmount: true },
    }),
    prisma.supplierTransaction.aggregate({
      where: { supplierId, status: "SETTLED" },
      _sum: { commissionAmount: true },
    }),
    prisma.supplierTransaction.aggregate({
      where: { supplierId, status: "COMPLETED" }, // delivered, commission owed, not yet paid out
      _sum: { commissionAmount: true },
    }),
    prisma.supplierOrder.count({ where: { supplierId, createdAt: { gte: todayStart } } }),
    prisma.supplierOrder.count({ where: { supplierId, createdAt: { gte: monthStart } } }),
    prisma.product.groupBy({
      by: ["status"],
      where: { supplierId, status: { not: "ARCHIVED" } },
      _count: true,
    }),
    prisma.product.findMany({
      where: { supplierId, status: { not: "ARCHIVED" } },
      select: { stockQty: true, reservedStock: true, lowStockAlert: true },
    }),
  ]);

  const gmv = Number(gmvAgg._sum.saleAmount ?? 0);
  const gmvOrderCount = gmvAgg._count;
  const realizedSales = Number(realizedAgg._sum.saleAmount ?? 0);
  const netEarnings = Number(realizedAgg._sum.supplierAmount ?? 0);

  const totalProducts = productCounts.reduce((sum, g) => sum + g._count, 0);
  const activeProducts = productCounts.find((g) => g.status === "ACTIVE")?._count ?? 0;
  const lowStockProducts = stockRows.filter(
    (p) => getStockStatus(p.stockQty, p.reservedStock, p.lowStockAlert) === "LOW_STOCK"
  ).length;
  const outOfStockProducts = stockRows.filter(
    (p) => getStockStatus(p.stockQty, p.reservedStock, p.lowStockAlert) === "OUT_OF_STOCK"
  ).length;

  return {
    todaySales: Number(todayAgg._sum.saleAmount ?? 0),
    yesterdaySales: Number(yesterdayAgg._sum.saleAmount ?? 0),
    monthlySales: Number(monthAgg._sum.saleAmount ?? 0),
    ordersToday: ordersTodayCount,
    ordersThisMonth: ordersMonthCount,
    averageOrderValue: gmvOrderCount > 0 ? gmv / gmvOrderCount : 0,
    gmv,
    realizedSales,
    commissionPaid: Number(settledAgg._sum.commissionAmount ?? 0),
    commissionPending: Number(completedAgg._sum.commissionAmount ?? 0),
    netEarnings,
    totalProducts,
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
  };
}

/** Daily sales for the last N days — for the "Daily Sales" line/bar chart. */
export async function getDailySales(supplierId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ day: string; total: number; orders: bigint }[]>`
    SELECT to_char(t."createdAt", 'YYYY-MM-DD') as day,
           SUM(t."saleAmount")::float as total,
           COUNT(DISTINCT t."supplierOrderId") as orders
    FROM supplier_transactions t
    WHERE t."supplierId" = ${supplierId}
      AND t.status != 'REVERSED'
      AND t."createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;
  return rows.map((r) => ({ day: r.day, total: r.total, orders: Number(r.orders) }));
}

/** Monthly revenue for the last N months — for the "Monthly Revenue" chart. */
export async function getMonthlyRevenue(supplierId: string, months = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const rows = await prisma.$queryRaw<{ month: string; total: number }[]>`
    SELECT to_char(t."createdAt", 'YYYY-MM') as month,
           SUM(t."saleAmount")::float as total
    FROM supplier_transactions t
    WHERE t."supplierId" = ${supplierId}
      AND t.status != 'REVERSED'
      AND t."createdAt" >= ${since}
    GROUP BY month
    ORDER BY month ASC
  `;
  return rows.map((r) => ({ month: r.month, total: r.total }));
}

/** Order counts grouped by SupplierOrder.status — for the "Orders by Status" chart. */
export async function getOrdersByStatus(supplierId: string) {
  const rows = await prisma.supplierOrder.groupBy({
    by: ["status"],
    where: { supplierId },
    _count: true,
  });
  return rows.map((r) => ({ status: r.status, count: r._count }));
}

/** Top selling products by revenue — for the "Top Selling Products" chart. */
export async function getTopProducts(supplierId: string, limit = 5) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { supplierOrder: { supplierId, status: { not: "CANCELLED" } } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, name: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return grouped.map((g) => ({
    productId: g.productId,
    name: byId.get(g.productId)?.name ?? "Unknown product",
    image: byId.get(g.productId)?.images[0]?.url ?? null,
    quantitySold: g._sum.quantity ?? 0,
    revenue: Number(g._sum.lineTotal ?? 0),
  }));
}

/** Revenue grouped by product category — for the "Revenue by Category" chart. */
export async function getRevenueByCategory(supplierId: string) {
  const rows = await prisma.$queryRaw<{ category: string; revenue: number }[]>`
    SELECT c.name as category, SUM(oi."lineTotal")::float as revenue
    FROM order_items oi
    JOIN products p ON oi."productId" = p.id
    JOIN categories c ON p."categoryId" = c.id
    JOIN supplier_orders so ON oi."supplierOrderId" = so.id
    WHERE so."supplierId" = ${supplierId}
      AND so.status != 'CANCELLED'
    GROUP BY c.name
    ORDER BY revenue DESC
  `;
  return rows;
}
