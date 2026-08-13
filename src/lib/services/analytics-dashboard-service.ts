import { prisma } from "@/lib/prisma";

/**
 * Read-side queries for the /admin/analytics dashboard. Kept separate
 * from AnalyticsService.track() (the write side) so the write path stays
 * minimal and fast — these queries are read-heavy and admin-only.
 */
export class AnalyticsDashboardService {
  static async getFunnel() {
    const stages = ["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START", "ORDER_COMPLETE"] as const;

    const counts = await Promise.all(
      stages.map((type) =>
        prisma.analyticsEvent.groupBy({ by: ["sessionId"], where: { type } }).then((rows) => rows.length)
      )
    );

    const [visitors, productViews, addToCart, checkoutStarted, completedOrders] = counts;
    const conversionRate = visitors > 0 ? (completedOrders / visitors) * 100 : 0;

    return {
      visitors,
      productViews,
      addToCart,
      checkoutStarted,
      completedOrders,
      conversionRate,
    };
  }

  static async getTopProducts(take = 10) {
    const grouped = await prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PRODUCT_VIEW", productId: { not: null } },
      _count: true,
      orderBy: { _count: { id: "desc" } },
      take,
    });

    const products = await prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId!) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return grouped.map((g) => ({ productId: g.productId!, name: nameById.get(g.productId!) ?? "Unknown", views: g._count }));
  }

  static async getTopCategories(take = 8) {
    const grouped = await prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PRODUCT_VIEW", productId: { not: null } },
      _count: true,
    });

    const products = await prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId!) } },
      select: { id: true, category: { select: { name: true } } },
    });
    const categoryById = new Map(products.map((p) => [p.id, p.category.name]));

    const viewsByCategory = new Map<string, number>();
    for (const g of grouped) {
      const category = categoryById.get(g.productId!);
      if (!category) continue;
      viewsByCategory.set(category, (viewsByCategory.get(category) ?? 0) + g._count);
    }

    return [...viewsByCategory.entries()]
      .map(([category, views]) => ({ category, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, take);
  }

  /** % of customers who have placed more than one order. */
  static async getCustomerRetention() {
    const orderCounts = await prisma.order.groupBy({ by: ["userId"], _count: true });
    const totalCustomers = orderCounts.length;
    const repeatCustomers = orderCounts.filter((o) => o._count > 1).length;
    return {
      totalCustomers,
      repeatCustomers,
      retentionRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
    };
  }

  static async getSupplierPerformance(take = 10) {
    const grouped = await prisma.supplierTransaction.groupBy({
      by: ["supplierId"],
      where: { status: { in: ["COMPLETED", "SETTLED"] } },
      _sum: { saleAmount: true },
      _count: true,
      orderBy: { _sum: { saleAmount: "desc" } },
      take,
    });

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: grouped.map((g) => g.supplierId) } },
      select: { id: true, companyName: true },
    });
    const nameById = new Map(suppliers.map((s) => [s.id, s.companyName]));

    return grouped.map((g) => ({
      supplierId: g.supplierId,
      companyName: nameById.get(g.supplierId) ?? "Unknown",
      realizedSales: Number(g._sum.saleAmount ?? 0),
      orderCount: g._count,
    }));
  }
}
