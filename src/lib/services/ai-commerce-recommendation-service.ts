import { prisma } from "@/lib/prisma";
import { SmartRecommendationService } from "@/lib/services/smart-recommendation-service";

/**
 * AICommerceRecommendationService — Phase 7.2
 *
 * Consolidates real recommendations for the AI Assistant page. Reuses
 * SmartRecommendationService (Phase 5.3) for discount/campaign
 * candidates rather than duplicating that logic; adds the genuinely
 * new categories (Flash Deal / Restock / Supplier Improvement) here.
 */
export interface AutoRecommendation {
  category: "FLASH_DEAL" | "MARKETING_CAMPAIGN" | "DISCOUNT" | "RESTOCK" | "SUPPLIER_IMPROVEMENT";
  title: string;
  reason: string;
  entityId: string;
}

export class AICommerceRecommendationService {
  static async getFlashDealCandidates(limit = 5): Promise<AutoRecommendation[]> {
    const now = new Date();
    const in30Days = new Date(now); in30Days.setDate(in30Days.getDate() + 30);

    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", expiryDate: { gte: now, lt: in30Days }, stockQty: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
      take: limit,
      select: { id: true, name: true, stockQty: true, expiryDate: true },
    });

    return products.map((p) => ({
      category: "FLASH_DEAL" as const,
      title: p.name,
      reason: `${p.stockQty} units expiring ${p.expiryDate!.toLocaleDateString("en-GB")} — a flash deal could clear this stock before it's lost.`,
      entityId: p.id,
    }));
  }

  static async getRestockCandidates(limit = 5): Promise<AutoRecommendation[]> {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", orderCount: { gt: 0 } },
      select: { id: true, name: true, stockQty: true, lowStockAlert: true, orderCount: true },
    });

    return products
      .filter((p) => p.lowStockAlert > 0 && p.stockQty <= p.lowStockAlert)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limit)
      .map((p) => ({
        category: "RESTOCK" as const,
        title: p.name,
        reason: `Only ${p.stockQty} units left (alert threshold: ${p.lowStockAlert}) — this product has ${p.orderCount} completed orders, restocking protects real demand.`,
        entityId: p.id,
      }));
  }

  static async getSupplierImprovementCandidates(limit = 5): Promise<AutoRecommendation[]> {
    const suppliers = await prisma.supplier.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: {
        id: true, companyName: true,
        products: { where: { status: "ACTIVE", viewCount: { gte: 20 } }, select: { viewCount: true, orderCount: true } },
      },
    });

    const withRate = suppliers
      .filter((s) => s.products.length > 0)
      .map((s) => {
        const totalViews = s.products.reduce((sum, p) => sum + p.viewCount, 0);
        const totalOrders = s.products.reduce((sum, p) => sum + p.orderCount, 0);
        return { id: s.id, name: s.companyName, rate: totalViews > 0 ? totalOrders / totalViews : 0, totalViews, totalOrders };
      })
      .filter((s) => s.rate < 0.02 && s.totalViews >= 50);

    return withRate
      .sort((a, b) => a.rate - b.rate)
      .slice(0, limit)
      .map((s) => ({
        category: "SUPPLIER_IMPROVEMENT" as const,
        title: s.name,
        reason: `${s.totalViews} total product views across their catalog but only ${s.totalOrders} orders (${(s.rate * 100).toFixed(1)}% conversion) — suggest reviewing pricing, images, or descriptions with this supplier.`,
        entityId: s.id,
      }));
  }

  static async getAll(): Promise<AutoRecommendation[]> {
    const [discounts, campaigns, flashDeals, restocks, supplierImprovements] = await Promise.all([
      SmartRecommendationService.getDiscountCandidates(5),
      SmartRecommendationService.getCategoriesNeedingActivation(5),
      this.getFlashDealCandidates(5),
      this.getRestockCandidates(5),
      this.getSupplierImprovementCandidates(5),
    ]);

    return [
      ...discounts.map((d) => ({ category: "DISCOUNT" as const, title: d.entityName, reason: d.message, entityId: d.entityId })),
      ...campaigns.map((c) => ({ category: "MARKETING_CAMPAIGN" as const, title: c.entityName, reason: c.message, entityId: c.entityId })),
      ...flashDeals,
      ...restocks,
      ...supplierImprovements,
    ];
  }
}
