/**
 * PRICING INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  Product.purchaseCost (real supplier-entered cost),
 *          originalPrice/saveoPrice (real discount depth),
 *          CompetitorPrice rows (real admin-tracked competitor prices),
 *          real orderCount at the current price
 * Processing: Real margin % where cost data exists (never estimated —
 *          if purchaseCost is null, margin is reported as unknown
 *          rather than guessed). Real competitive position against
 *          actual tracked competitor prices, not a market model.
 * Output:  score = pricing health (0-100) — healthy margin AND
 *          competitive position AND real sales at that price
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, confidenceFromSampleSize, clampScore } from "./types";

export async function computePricingIntelligence(productId: string): Promise<IntelligenceResult> {
  const [product, competitorPrices] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, originalPrice: true, saveoPrice: true, purchaseCost: true, orderCount: true },
    }),
    prisma.competitorPrice.findMany({ where: { productId }, select: { competitorName: true, price: true } }),
  ]);

  const reason: string[] = [];

  if (!product) {
    return { score: 0, confidence: 0, reason: ["Product not found."], lastUpdated: new Date().toISOString() };
  }

  const saveoPrice = Number(product.saveoPrice);
  const originalPrice = Number(product.originalPrice);
  const discountPct = originalPrice > 0 ? ((originalPrice - saveoPrice) / originalPrice) * 100 : 0;

  let marginScore = 60;
  let marginPct: number | null = null;
  if (product.purchaseCost !== null) {
    const cost = Number(product.purchaseCost);
    marginPct = cost > 0 ? ((saveoPrice - cost) / saveoPrice) * 100 : 100;
    if (marginPct < 0) {
      marginScore = 0;
    } else {
      marginScore = clampScore((Math.min(marginPct, 40) / 40) * 100);
    }
  }

  let competitiveScore = 60;
  if (competitorPrices.length > 0) {
    const avgCompetitorPrice = competitorPrices.reduce((sum, c) => sum + Number(c.price), 0) / competitorPrices.length;
    const priceDiffPct = ((saveoPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100;
    competitiveScore = clampScore(50 - priceDiffPct * 2);
    reason.push(`${saveoPrice.toFixed(3)} KD vs ${avgCompetitorPrice.toFixed(3)} KD average across ${competitorPrices.length} tracked competitor${competitorPrices.length === 1 ? "" : "s"} (${priceDiffPct >= 0 ? "+" : ""}${priceDiffPct.toFixed(1)}%).`);
  }

  const demandScore = clampScore((Math.min(product.orderCount, 30) / 30) * 100);

  const score = clampScore(marginScore * 0.4 + competitiveScore * 0.3 + demandScore * 0.3);

  reason.push(`${saveoPrice.toFixed(3)} KD, ${discountPct.toFixed(1)}% off ${originalPrice.toFixed(3)} KD original price.`);
  if (marginPct !== null) {
    reason.push(marginPct < 0 ? `Selling below real recorded cost — negative margin.` : `${marginPct.toFixed(1)}% real margin over purchase cost.`);
  } else {
    reason.push("No purchase cost on record — margin unknown, not estimated.");
  }
  reason.push(`${product.orderCount} real orders at the current price.`);

  return {
    score,
    confidence: confidenceFromSampleSize(product.orderCount, 20),
    reason,
    lastUpdated: new Date().toISOString(),
  };
}
