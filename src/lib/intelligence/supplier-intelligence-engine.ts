/**
 * SUPPLIER INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  SupplierOrder (status distribution), SupplierTransaction
 *          (real revenue), Review (via the supplier's own products)
 * Processing: Real fulfillment rate = DELIVERED / total resolved
 *          orders, tracked separately from cancellation rate since a
 *          supplier can be "slow but reliable" or "fast but flaky."
 * Output:  score = supplier reliability (0-100)
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, confidenceFromSampleSize, clampScore } from "./types";

export async function computeSupplierIntelligence(supplierId: string): Promise<IntelligenceResult> {
  const [orders, revenueAgg, productIds] = await Promise.all([
    prisma.supplierOrder.findMany({ where: { supplierId }, select: { status: true } }),
    prisma.supplierTransaction.aggregate({
      where: { supplierId, status: "SETTLED" },
      _sum: { supplierAmount: true },
    }),
    prisma.product.findMany({ where: { supplierId }, select: { id: true } }),
  ]);

  const reason: string[] = [];

  if (orders.length === 0) {
    reason.push("No supplier orders yet — too early to score reliability.");
    return { score: 50, confidence: 0, reason, lastUpdated: new Date().toISOString() };
  }

  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
  const resolved = delivered + cancelled;

  const fulfillmentRate = resolved > 0 ? delivered / resolved : 0;
  const cancellationRate = resolved > 0 ? cancelled / resolved : 0;

  const reviewAgg = productIds.length > 0
    ? await prisma.review.aggregate({
        where: { productId: { in: productIds.map((p) => p.id) }, status: "APPROVED" },
        _avg: { rating: true },
        _count: { rating: true },
      })
    : { _avg: { rating: null as number | null }, _count: { rating: 0 } };

  const fulfillmentScore = clampScore(fulfillmentRate * 100);
  const cancellationScore = clampScore(100 - cancellationRate * 200);
  const reviewScore = reviewAgg._avg.rating !== null ? clampScore((reviewAgg._avg.rating / 5) * 100) : 60;

  const score = clampScore(fulfillmentScore * 0.5 + cancellationScore * 0.3 + reviewScore * 0.2);

  reason.push(`${orders.length} total supplier orders (${delivered} delivered, ${cancelled} cancelled, ${orders.length - resolved} still in progress).`);
  if (resolved > 0) {
    reason.push(`${(fulfillmentRate * 100).toFixed(1)}% fulfillment rate on resolved orders.`);
  }
  const revenue = Number(revenueAgg._sum.supplierAmount ?? 0);
  reason.push(`${revenue.toFixed(3)} KD in real paid revenue.`);
  if (reviewAgg._avg.rating !== null) {
    reason.push(`${reviewAgg._avg.rating.toFixed(1)}★ average across this supplier's products (${reviewAgg._count.rating} reviews).`);
  }

  return {
    score,
    confidence: confidenceFromSampleSize(resolved, 15),
    reason,
    lastUpdated: new Date().toISOString(),
  };
}
