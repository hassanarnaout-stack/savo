import { prisma } from "@/lib/prisma";
import { ProductAccountingService } from "@/lib/services/product-accounting-service";

/**
 * PricingEngineService — Phase 7.3
 *
 * SCOPE NOTES (same honesty standard as every prior "intelligence"
 * service in this codebase):
 *   - "Competitor Difference" uses Saveo's own category average price
 *     as the real, available proxy — there's no external competitor
 *     data source. Same convention as SupplierIntelligenceService
 *     (Phase 6.9).
 *   - "Elasticity Score" is a real conversion-rate-based proxy (this
 *     product's view→order rate vs. its category's average), NOT a
 *     true price-elasticity model — that needs historical price-change
 *     data this schema doesn't track. Labeled honestly as an estimate.
 *   - Every suggestion is read-only. Nothing here ever writes to
 *     Product.saveoPrice — every change requires an explicit admin
 *     "Approve" action that calls the existing product update route.
 */
export type PricingAction = "INCREASE" | "DECREASE" | "KEEP";

export interface PricingAnalysis {
  productId: string;
  name: string;
  currentPrice: number;
  currentMargin: number | null;
  suggestedPrice: number;
  minimumPrice: number;
  maximumPrice: number;
  competitorDifferencePercent: number | null;
  competitorPriceSource: "REAL" | "CATEGORY_AVERAGE";
  competitorPrices: { id: string; competitorName: string; price: number }[];
  profitDifference: number;
  elasticityScore: number;
  action: PricingAction;
  explanation: string;
}

const MIN_MARGIN_PERCENT = 10;
const NUDGE_PERCENT = 10;

export class PricingEngineService {
  static async analyzeProduct(productId: string): Promise<PricingAnalysis | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true, name: true, saveoPrice: true, purchaseCost: true, categoryId: true,
        viewCount: true, orderCount: true,
        supplier: { select: { commissionRate: true } },
      },
    });
    if (!product) return null;

    const currentPrice = Number(product.saveoPrice);
    const breakdown = ProductAccountingService.calculate({
      sellingPrice: currentPrice,
      purchaseCost: product.purchaseCost ? Number(product.purchaseCost) : null,
      commissionRate: Number(product.supplier.commissionRate),
      vatRate: 0,
    });

    // Real, admin-entered competitor prices take priority over the category-average proxy whenever they exist.
    const realCompetitorPrices = await prisma.competitorPrice.findMany({
      where: { productId: product.id },
      select: { id: true, price: true, competitorName: true },
    });

    const categoryPeers = await prisma.product.findMany({
      where: { categoryId: product.categoryId, status: "ACTIVE", id: { not: product.id } },
      select: { saveoPrice: true, viewCount: true, orderCount: true },
    });

    const categoryAvgPrice = categoryPeers.length > 0
      ? categoryPeers.reduce((s, p) => s + Number(p.saveoPrice), 0) / categoryPeers.length
      : currentPrice;

    const hasRealCompetitorData = realCompetitorPrices.length > 0;
    const referencePrice = hasRealCompetitorData
      ? realCompetitorPrices.reduce((s, c) => s + Number(c.price), 0) / realCompetitorPrices.length
      : categoryAvgPrice;
    const competitorPriceSource: "REAL" | "CATEGORY_AVERAGE" = hasRealCompetitorData ? "REAL" : "CATEGORY_AVERAGE";

    const peersWithViews = categoryPeers.filter((p) => p.viewCount > 0);
    const categoryAvgConversion = peersWithViews.length > 0
      ? peersWithViews.reduce((s, p) => s + p.orderCount / p.viewCount, 0) / peersWithViews.length
      : 0;
    const thisConversion = product.viewCount > 0 ? product.orderCount / product.viewCount : 0;

    const competitorDifferencePercent = (hasRealCompetitorData || categoryPeers.length > 0)
      ? Number((((currentPrice - referencePrice) / referencePrice) * 100).toFixed(1))
      : null;

    const elasticityScore = categoryAvgConversion > 0
      ? Math.round(Math.min(100, Math.max(0, (1 - thisConversion / categoryAvgConversion) * 100)))
      : 0;

    const minimumPrice = product.purchaseCost
      ? Number((Number(product.purchaseCost) / (1 - MIN_MARGIN_PERCENT / 100)).toFixed(3))
      : Number((currentPrice * 0.7).toFixed(3));
    const maximumPrice = Number((referencePrice * 1.15).toFixed(3));

    const sourceLabel = hasRealCompetitorData
      ? `real competitor prices (${realCompetitorPrices.map((c) => c.competitorName).join(", ")}, avg KD ${referencePrice.toFixed(3)})`
      : `the category average (KD ${referencePrice.toFixed(3)} — no competitor prices entered for this product yet)`;

    let action: PricingAction = "KEEP";
    let suggestedPrice = currentPrice;
    let explanation = `Priced within a normal range of ${sourceLabel} with typical conversion — no change suggested.`;

    const significantlyCheap = competitorDifferencePercent !== null && competitorDifferencePercent < -15;
    const significantlyExpensive = competitorDifferencePercent !== null && competitorDifferencePercent > 15;
    const healthyConversion = categoryAvgConversion > 0 && thisConversion >= categoryAvgConversion;
    const weakConversion = categoryAvgConversion > 0 && thisConversion < categoryAvgConversion * 0.7;

    if (significantlyCheap && healthyConversion) {
      action = "INCREASE";
      suggestedPrice = Math.min(maximumPrice, Number((currentPrice * (1 + NUDGE_PERCENT / 100)).toFixed(3)));
      explanation = `Priced ${Math.abs(competitorDifferencePercent!).toFixed(1)}% below ${sourceLabel} while converting at or above the category's typical rate — there's real margin room without hurting demand.`;
    } else if (significantlyExpensive && weakConversion) {
      action = "DECREASE";
      suggestedPrice = Math.max(minimumPrice, Number((currentPrice * (1 - NUDGE_PERCENT / 100)).toFixed(3)));
      explanation = `Priced ${competitorDifferencePercent!.toFixed(1)}% above ${sourceLabel} with a conversion rate well below the category's typical rate — price may be suppressing demand.`;
    }

    const suggestedBreakdown = ProductAccountingService.calculate({
      sellingPrice: suggestedPrice,
      purchaseCost: product.purchaseCost ? Number(product.purchaseCost) : null,
      commissionRate: Number(product.supplier.commissionRate),
      vatRate: 0,
    });
    const profitDifference = (suggestedBreakdown.netProfit ?? 0) - (breakdown.netProfit ?? 0);

    return {
      productId: product.id,
      name: product.name,
      currentPrice,
      currentMargin: breakdown.marginPercent,
      suggestedPrice,
      minimumPrice,
      maximumPrice,
      competitorDifferencePercent,
      competitorPriceSource,
      competitorPrices: realCompetitorPrices.map((c) => ({ id: c.id, competitorName: c.competitorName, price: Number(c.price) })),
      profitDifference: Number(profitDifference.toFixed(3)),
      elasticityScore,
      action,
      explanation,
    };
  }

  static async getAllWithSuggestions(limit = 50): Promise<PricingAnalysis[]> {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", purchaseCost: { not: null }, viewCount: { gte: 10 } },
      select: { id: true },
      take: limit,
    });

    const results: PricingAnalysis[] = [];
    for (const p of products) {
      const analysis = await this.analyzeProduct(p.id);
      if (analysis) results.push(analysis);
    }
    return results;
  }

  static async getMarginWarnings(): Promise<PricingAnalysis[]> {
    const all = await this.getAllWithSuggestions(200);
    return all.filter((a) => a.currentMargin !== null && a.currentMargin < MIN_MARGIN_PERCENT).sort((a, b) => (a.currentMargin ?? 0) - (b.currentMargin ?? 0));
  }
}
