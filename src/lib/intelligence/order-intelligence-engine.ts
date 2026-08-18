/**
 * ORDER INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  This order's value vs the same customer's real historical
 *          average, payment method, gift flag, return requests on
 *          this specific order
 * Processing: Real anomaly detection against the customer's own
 *          baseline — "large for THIS customer" is more meaningful
 *          than any fixed KD threshold across all customers.
 * Output:  score = order health (0-100, lower = more anomalous/worth
 *          a human look, not "worse" in a moral sense)
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, clampScore } from "./types";

export async function computeOrderIntelligence(orderId: string): Promise<IntelligenceResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, total: true, paymentMethod: true, status: true, createdAt: true, isGift: true },
  });
  const reason: string[] = [];

  if (!order) {
    return { score: 0, confidence: 0, reason: ["Order not found."], lastUpdated: new Date().toISOString() };
  }

  const [priorOrders, returnCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: order.userId, id: { not: orderId }, status: { not: "CANCELLED" } },
      select: { total: true },
    }),
    prisma.returnRequest.count({ where: { orderId } }),
  ]);

  const orderTotal = Number(order.total);
  let score = 100;

  if (priorOrders.length === 0) {
    reason.push("This is the customer's first order — no history to compare against yet.");
  } else {
    const avgPrior = priorOrders.reduce((sum, o) => sum + Number(o.total), 0) / priorOrders.length;
    const ratio = avgPrior > 0 ? orderTotal / avgPrior : 1;
    reason.push(`KD ${orderTotal.toFixed(3)} vs this customer's KD ${avgPrior.toFixed(3)} average over ${priorOrders.length} prior order${priorOrders.length === 1 ? "" : "s"}.`);

    if (ratio > 3) {
      score -= 30;
      reason.push(`${ratio.toFixed(1)}x their normal order size — real outlier worth a second look, not necessarily a problem.`);
    } else if (ratio > 2) {
      score -= 10;
      reason.push(`${ratio.toFixed(1)}x their normal order size — somewhat larger than usual.`);
    }
  }

  if (returnCount > 0) {
    score -= 25;
    reason.push(`${returnCount} return request${returnCount === 1 ? "" : "s"} filed on this order.`);
  }

  if (order.status === "CANCELLED") {
    score -= 20;
    reason.push("Order was cancelled.");
  }

  if (order.isGift) {
    reason.push("Marked as a gift order.");
  }

  reason.push(`Payment method: ${order.paymentMethod}.`);

  return {
    score: clampScore(score),
    confidence: priorOrders.length === 0 ? 30 : Math.min(100, 40 + priorOrders.length * 10),
    reason,
    lastUpdated: new Date().toISOString(),
  };
}
