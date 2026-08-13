import { prisma } from "@/lib/prisma";

/**
 * SupplierIntelligenceService — Phase 6.9
 *
 * "Competitor insights" as literally requested (pricing/stock from
 * other real marketplaces) isn't buildable honestly — Saveo has no
 * external market data source. What's built instead: category average
 * price, computed from Saveo's own real product data, the closest
 * genuinely-available proxy for "how does my price compare". Every
 * other metric here is a real computation, not a placeholder.
 */
export interface BestSellingProduct {
  productId: string;
  name: string;
  orderCount: number;
  revenue: number;
}

export interface PriceSuggestion {
  productId: string;
  productName: string;
  yourPrice: number;
  categoryAveragePrice: number;
  suggestion: string;
}

export interface PromotionRecommendation {
  productId: string;
  productName: string;
  reason: string;
}

export class SupplierIntelligenceService {
  static async getBestSellingProducts(supplierId: string, limit = 10): Promise<BestSellingProduct[]> {
    const products = await prisma.product.findMany({
      where: { supplierId, orderCount: { gt: 0 } },
      orderBy: { orderCount: "desc" },
      take: limit,
      select: { id: true, name: true, orderCount: true, saveoPrice: true },
    });

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      orderCount: p.orderCount,
      revenue: Number(p.saveoPrice) * p.orderCount,
    }));
  }

  static async getConversionRates(supplierId: string) {
    const products = await prisma.product.findMany({
      where: { supplierId, viewCount: { gt: 0 } },
      select: { id: true, name: true, viewCount: true, orderCount: true },
      orderBy: { viewCount: "desc" },
      take: 20,
    });

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      views: p.viewCount,
      orders: p.orderCount,
      conversionRate: Number(((p.orderCount / p.viewCount) * 100).toFixed(2)),
    }));
  }

  static async getPriceSuggestions(supplierId: string): Promise<PriceSuggestion[]> {
    const products = await prisma.product.findMany({
      where: { supplierId, status: "ACTIVE" },
      select: { id: true, name: true, saveoPrice: true, categoryId: true },
    });

    const suggestions: PriceSuggestion[] = [];
    for (const product of products) {
      const categoryAvg = await prisma.product.aggregate({
        where: { categoryId: product.categoryId, status: "ACTIVE", id: { not: product.id } },
        _avg: { saveoPrice: true },
      });
      const avgPrice = Number(categoryAvg._avg.saveoPrice ?? 0);
      if (avgPrice === 0) continue;

      const yourPrice = Number(product.saveoPrice);
      const diffPercent = ((yourPrice - avgPrice) / avgPrice) * 100;

      let suggestion = "In line with category average";
      if (diffPercent > 15) suggestion = `${diffPercent.toFixed(0)}% above category average — consider reviewing`;
      else if (diffPercent < -15) suggestion = `${Math.abs(diffPercent).toFixed(0)}% below category average — room to increase margin`;

      suggestions.push({ productId: product.id, productName: product.name, yourPrice, categoryAveragePrice: Number(avgPrice.toFixed(3)), suggestion });
    }
    return suggestions;
  }

  static async getPromotionRecommendations(supplierId: string): Promise<PromotionRecommendation[]> {
    const products = await prisma.product.findMany({
      where: { supplierId, status: "ACTIVE", viewCount: { gte: 20 } },
      select: { id: true, name: true, viewCount: true, orderCount: true },
    });

    return products
      .map((p) => ({ ...p, rate: p.orderCount / p.viewCount }))
      .filter((p) => p.rate < 0.02)
      .slice(0, 5)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        reason: `${p.viewCount} views, only ${p.orderCount} orders — a promotion could convert this traffic`,
      }));
  }
}
