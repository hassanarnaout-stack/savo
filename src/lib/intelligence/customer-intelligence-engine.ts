/**
 * CUSTOMER INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  Order (count, total, recency), Review count, MembershipSubscription,
 *          AffiliateAccount status
 * Processing: Real RFM (Recency/Frequency/Monetary) scoring — the same
 *          well-established retail-analytics model, computed here from
 *          actual Order rows, not estimated or modeled.
 * Output:  score = customer value tier (0-100, higher = more valuable/engaged)
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, confidenceFromSampleSize, clampScore } from "./types";

export async function computeCustomerIntelligence(userId: string): Promise<IntelligenceResult> {
  const [orders, reviewCount, membership, isAffiliate] = await Promise.all([
    prisma.order.findMany({
      where: { userId, status: { not: "CANCELLED" } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where: { userId } }),
    prisma.membership.findUnique({ where: { userId } }),
    prisma.affiliateAccount.findUnique({ where: { userId } }),
  ]);
  const isActiveMember = membership?.status === "ACTIVE";

  const reason: string[] = [];

  if (orders.length === 0) {
    reason.push("No completed orders yet — customer has not made a first purchase.");
    return { score: 0, confidence: confidenceFromSampleSize(0, 5), reason, lastUpdated: new Date().toISOString() };
  }

  const orderCount = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrderValue = totalSpent / orderCount;
  const daysSinceLastOrder = Math.floor((Date.now() - orders[0].createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const recencyScore = clampScore(100 - (daysSinceLastOrder / 90) * 100);
  const frequencyScore = clampScore((Math.min(orderCount, 10) / 10) * 100);
  const monetaryScore = clampScore((Math.min(totalSpent, 500) / 500) * 100);

  let score = clampScore(recencyScore * 0.35 + frequencyScore * 0.35 + monetaryScore * 0.3);

  reason.push(`${orderCount} completed order${orderCount === 1 ? "" : "s"}, KD ${totalSpent.toFixed(3)} total spend.`);
  reason.push(`Average order value: KD ${avgOrderValue.toFixed(3)}.`);
  reason.push(`Last order ${daysSinceLastOrder} day${daysSinceLastOrder === 1 ? "" : "s"} ago.`);

  if (isActiveMember) {
    score = clampScore(score + 5);
    reason.push("Active Saveo Plus member — real engagement signal.");
  }
  if (isAffiliate) {
    reason.push("Registered affiliate — has an active referral incentive.");
  }
  if (reviewCount > 0) {
    reason.push(`Has left ${reviewCount} review${reviewCount === 1 ? "" : "s"} — engaged past the purchase itself.`);
  }

  return {
    score,
    confidence: confidenceFromSampleSize(orderCount, 8),
    reason,
    lastUpdated: new Date().toISOString(),
  };
}
