import { prisma } from "@/lib/prisma";

/**
 * ABCAnalysisService — Phase 7.5
 *
 * Classic inventory-management ABC classification: rank products by
 * real revenue contribution, then bucket by cumulative share —
 * A = top ~80% of revenue, B = next ~15%, C = the remaining ~5%. Real
 * computation from real order data, standard methodology.
 */
export type ABCTier = "A" | "B" | "C";

export interface ABCProduct {
  productId: string;
  name: string;
  revenue: number;
  cumulativePercent: number;
  tier: ABCTier;
}

export class ABCAnalysisService {
  static async analyze(): Promise<{ products: ABCProduct[]; summary: Record<ABCTier, { count: number; revenue: number }> }> {
    const items = await prisma.orderItem.findMany({
      where: { supplierOrder: { status: { not: "CANCELLED" } } },
      select: { lineTotal: true, productId: true, product: { select: { name: true } } },
    });

    const byProduct = new Map<string, { name: string; revenue: number }>();
    for (const item of items) {
      const existing = byProduct.get(item.productId) ?? { name: item.product.name, revenue: 0 };
      existing.revenue += Number(item.lineTotal);
      byProduct.set(item.productId, existing);
    }

    const totalRevenue = Array.from(byProduct.values()).reduce((s, p) => s + p.revenue, 0);
    const sorted = Array.from(byProduct.entries())
      .map(([productId, v]) => ({ productId, name: v.name, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    let cumulative = 0;
    const products: ABCProduct[] = sorted.map((p) => {
      cumulative += p.revenue;
      const cumulativePercent = totalRevenue > 0 ? Number(((cumulative / totalRevenue) * 100).toFixed(1)) : 0;
      const tier: ABCTier = cumulativePercent <= 80 ? "A" : cumulativePercent <= 95 ? "B" : "C";
      return { productId: p.productId, name: p.name, revenue: Number(p.revenue.toFixed(3)), cumulativePercent, tier };
    });

    const summary: Record<ABCTier, { count: number; revenue: number }> = {
      A: { count: 0, revenue: 0 },
      B: { count: 0, revenue: 0 },
      C: { count: 0, revenue: 0 },
    };
    for (const p of products) {
      summary[p.tier].count++;
      summary[p.tier].revenue += p.revenue;
    }

    return { products, summary };
  }
}
