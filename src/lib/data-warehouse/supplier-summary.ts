/**
 * SUPPLIER SUMMARY
 * ============================================================
 * Reuses BIAggregationService's exact real financial convention:
 * grossSales = sum(saleAmount) where status != REVERSED
 * realizedSales/commission = sum(...) where status in (COMPLETED, SETTLED)
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { SupplierSummary, BuildStats } from "./types";
import { warehouseCache, cacheKey } from "./warehouse-cache";

const REALIZED_STATUSES = ["COMPLETED", "SETTLED"] as const;

export async function buildSupplierSummaries(): Promise<{ summaries: SupplierSummary[]; stats: BuildStats }> {
  const start = Date.now();
  let queryCount = 0;

  const [suppliers, supplierOrders, transactions, productCounts] = await Promise.all([
    prisma.supplier.findMany({ select: { id: true, companyName: true } }).then((r) => { queryCount++; return r; }),
    prisma.supplierOrder.findMany({ select: { supplierId: true, status: true, subtotal: true } }).then((r) => { queryCount++; return r; }),
    prisma.supplierTransaction.findMany({ select: { supplierId: true, status: true, saleAmount: true, commissionAmount: true, supplierAmount: true } }).then((r) => { queryCount++; return r; }),
    prisma.product.groupBy({ by: ["supplierId"], _count: true }).then((r) => { queryCount++; return r; }),
  ]);

  const productCountBySupplier = new Map(productCounts.map((p) => [p.supplierId, p._count]));

  interface SOAgg { orders: number; completed: number; cancelled: number; delivered: number; totalValue: number; }
  const soBySupplier = new Map<string, SOAgg>();
  for (const so of supplierOrders) {
    if (!soBySupplier.has(so.supplierId)) soBySupplier.set(so.supplierId, { orders: 0, completed: 0, cancelled: 0, delivered: 0, totalValue: 0 });
    const agg = soBySupplier.get(so.supplierId)!;
    agg.orders += 1;
    agg.totalValue += Number(so.subtotal);
    if (so.status === "DELIVERED") { agg.completed += 1; agg.delivered += 1; }
    if (so.status === "CANCELLED") agg.cancelled += 1;
  }

  interface TxAgg { gross: number; realized: number; commission: number; payable: number; }
  const txBySupplier = new Map<string, TxAgg>();
  for (const tx of transactions) {
    if (!txBySupplier.has(tx.supplierId)) txBySupplier.set(tx.supplierId, { gross: 0, realized: 0, commission: 0, payable: 0 });
    const agg = txBySupplier.get(tx.supplierId)!;
    if (tx.status !== "REVERSED") agg.gross += Number(tx.saleAmount);
    if ((REALIZED_STATUSES as readonly string[]).includes(tx.status)) {
      agg.realized += Number(tx.saleAmount);
      agg.commission += Number(tx.commissionAmount);
      agg.payable += Number(tx.supplierAmount);
    }
  }

  const summaries: SupplierSummary[] = suppliers.map((s) => {
    const so = soBySupplier.get(s.id) ?? { orders: 0, completed: 0, cancelled: 0, delivered: 0, totalValue: 0 };
    const tx = txBySupplier.get(s.id) ?? { gross: 0, realized: 0, commission: 0, payable: 0 };
    const resolved = so.completed + so.cancelled;

    const completionRate = resolved > 0 ? Number((so.completed / resolved).toFixed(4)) : null;
    const cancellationRate = resolved > 0 ? Number((so.cancelled / resolved).toFixed(4)) : null;
    const avgOrderValue = so.orders > 0 ? Number((so.totalValue / so.orders).toFixed(3)) : null;

    const fulfillmentPart = completionRate !== null ? completionRate * 100 : 50;
    const cancellationPart = cancellationRate !== null ? Math.max(0, 100 - cancellationRate * 200) : 70;
    const supplierScore = Math.round(Math.max(0, Math.min(100, fulfillmentPart * 0.6 + cancellationPart * 0.4)));

    return {
      supplierId: s.id,
      supplierName: s.companyName,
      productCount: productCountBySupplier.get(s.id) ?? 0,
      ordersCount: so.orders,
      completedOrders: so.completed,
      cancelledOrders: so.cancelled,
      deliveredOrders: so.delivered,
      grossSales: Number(tx.gross.toFixed(3)),
      realizedSales: Number(tx.realized.toFixed(3)),
      commission: Number(tx.commission.toFixed(3)),
      netPayable: Number(tx.payable.toFixed(3)),
      averageOrderValue: avgOrderValue,
      completionRate,
      cancellationRate,
      returnRate: null,
      supplierScore,
      lastUpdated: new Date().toISOString(),
    };
  });

  const stats: BuildStats = { recordsProcessed: summaries.length, queryCount, durationMs: Date.now() - start };
  for (const s of summaries) warehouseCache.set(cacheKey("supplier", s.supplierId), s, stats);

  return { summaries, stats };
}

export function getSupplierSummary(supplierId: string): SupplierSummary | null {
  return warehouseCache.get<SupplierSummary>(cacheKey("supplier", supplierId));
}
