/**
 * BRAND INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  Product.brandName (real manufacturer brand, e.g. "Lindt") —
 *          aggregated orderCount, viewCount, review ratings across every
 *          product tagged with that brand.
 * Processing: Sums and averages real per-product signals across the
 *          whole brand's product line.
 * Output:  score = brand commercial strength on Savo (0-100)
 * ============================================================
 * Note: operates on the manufacturer brand name (Product.brandName),
 * intentionally separate from BrandAccount (the sponsored-ads dashboard
 * login) — most brands sold on Savo have no BrandAccount at all.
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, confidenceFromSampleSize, clampScore } from "./types";

export async function computeBrandIntelligence(brandName: string): Promise<IntelligenceResult> {
  const products = await prisma.product.findMany({
    where: { brandName, status: "ACTIVE" },
    select: { id: true, orderCount: true, viewCount: true },
  });

  const reason: string[] = [];

  if (products.length === 0) {
    reason.push(`No active products found tagged with brand "${brandName}".`);
    return { score: 0, confidence: 0, reason, lastUpdated: new Date().toISOString() };
  }

  const productIds = products.map((p) => p.id);
  const reviewAgg = await prisma.review.aggregate({
    where: { productId: { in: productIds }, status: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const totalOrders = products.reduce((sum, p) => sum + p.orderCount, 0);
  const totalViews = products.reduce((sum, p) => sum + p.viewCount, 0);
  const avgRating = reviewAgg._avg.rating;
  const reviewCount = reviewAgg._count.rating;

  const breadthScore = clampScore((Math.min(products.length, 10) / 10) * 100);
  const demandScore = clampScore((Math.min(totalOrders, 200) / 200) * 100);
  const sentimentScore = avgRating !== null ? clampScore((avgRating / 5) * 100) : 60;

  const score = clampScore(breadthScore * 0.2 + demandScore * 0.5 + sentimentScore * 0.3);

  reason.push(`${products.length} active product${products.length === 1 ? "" : "s"} under this brand.`);
  reason.push(`${totalOrders} combined real orders, ${totalViews} combined page views.`);
  if (avgRating !== null) {
    reason.push(`${avgRating.toFixed(1)}★ average across ${reviewCount} approved review${reviewCount === 1 ? "" : "s"} for this brand's products.`);
  } else {
    reason.push("No approved reviews yet across this brand's products.");
  }

  return {
    score,
    confidence: confidenceFromSampleSize(totalOrders, 50),
    reason,
    lastUpdated: new Date().toISOString(),
  };
}
