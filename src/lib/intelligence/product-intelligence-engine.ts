/**
 * PRODUCT INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  Product (orderCount, viewCount), Review (rating avg + count),
 *          ReturnRequest count, current stock status
 * Processing: Weighted blend of real sales velocity, real review
 *          sentiment, and real return rate — all read directly, no
 *          modeling or estimation.
 * Output:  score = product health/performance (0-100)
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, confidenceFromSampleSize, clampScore } from "./types";

export async function computeProductIntelligence(productId: string): Promise<IntelligenceResult> {
  const [product, reviewAgg, returnCount] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, orderCount: true, viewCount: true, status: true, stockQty: true, reservedStock: true },
    }),
    prisma.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.returnRequest.count({ where: { order: { supplierOrders: { some: { items: { some: { productId } } } } } } }),
  ]);

  const reason: string[] = [];

  if (!product) {
    return { score: 0, confidence: 0, reason: ["Product not found."], lastUpdated: new Date().toISOString() };
  }

  const avgRating = reviewAgg._avg.rating ?? null;
  const reviewCount = reviewAgg._count.rating;

  const salesScore = clampScore((Math.min(product.orderCount, 50) / 50) * 100);
  const reviewScore = avgRating !== null ? clampScore((avgRating / 5) * 100) : 60;
  const returnRate = product.orderCount > 0 ? returnCount / product.orderCount : 0;
  const returnScore = clampScore(100 - returnRate * 300);

  const score = clampScore(salesScore * 0.4 + reviewScore * 0.4 + returnScore * 0.2);

  reason.push(`${product.orderCount} real orders, ${product.viewCount} page views.`);
  if (avgRating !== null) {
    reason.push(`${avgRating.toFixed(1)}★ average over ${reviewCount} approved review${reviewCount === 1 ? "" : "s"}.`);
  } else {
    reason.push("No approved reviews yet.");
  }
  if (returnCount > 0) {
    reason.push(`${returnCount} return request${returnCount === 1 ? "" : "s"} against ${product.orderCount} orders (${(returnRate * 100).toFixed(1)}% return rate).`);
  }
  if (product.status === "OUT_OF_STOCK") {
    reason.push("Currently out of stock — real demand may be going unfulfilled.");
  }

  const confidence = Math.round(
    (confidenceFromSampleSize(product.orderCount, 20) + confidenceFromSampleSize(reviewCount, 10)) / 2
  );

  return { score, confidence, reason, lastUpdated: new Date().toISOString() };
}
