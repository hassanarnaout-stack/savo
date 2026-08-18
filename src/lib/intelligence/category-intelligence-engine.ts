/**
 * CATEGORY INTELLIGENCE ENGINE
 * ============================================================
 * Inputs:  Product (count, orderCount within category), Order value
 *          for this month vs last month (real growth trend)
 * Processing: Real product breadth + real demand + real month-over-month
 *          trend, computed directly from order/product data.
 * Output:  score = category commercial health (0-100)
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntelligenceResult, confidenceFromSampleSize, clampScore } from "./types";

export async function computeCategoryIntelligence(categoryId: string): Promise<IntelligenceResult> {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } });
  const reason: string[] = [];

  if (!category) {
    return { score: 0, confidence: 0, reason: ["Category not found."], lastUpdated: new Date().toISOString() };
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [products, thisMonthOrders, lastMonthOrders] = await Promise.all([
    prisma.product.findMany({
      where: { categoryId, status: "ACTIVE" },
      select: { id: true, orderCount: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfThisMonth },
        status: { not: "CANCELLED" },
        supplierOrders: { some: { items: { some: { product: { categoryId } } } } },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        status: { not: "CANCELLED" },
        supplierOrders: { some: { items: { some: { product: { categoryId } } } } },
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const totalOrders = products.reduce((sum, p) => sum + p.orderCount, 0);
  const thisMonthRevenue = Number(thisMonthOrders._sum.total ?? 0);
  const lastMonthRevenue = Number(lastMonthOrders._sum.total ?? 0);

  const breadthScore = clampScore((Math.min(products.length, 20) / 20) * 100);
  const demandScore = clampScore((Math.min(totalOrders, 300) / 300) * 100);

  let growthScore = 50;
  let growthPct: number | null = null;
  if (lastMonthRevenue > 0) {
    growthPct = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    growthScore = clampScore(50 + growthPct);
  } else if (thisMonthRevenue > 0) {
    growthScore = 90;
  }

  const score = clampScore(breadthScore * 0.25 + demandScore * 0.45 + growthScore * 0.3);

  reason.push(`${products.length} active product${products.length === 1 ? "" : "s"} in "${category.name}", ${totalOrders} combined real orders.`);
  reason.push(`This month: ${thisMonthOrders._count} orders, KD ${thisMonthRevenue.toFixed(3)} revenue.`);
  if (growthPct !== null) {
    reason.push(`${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}% revenue vs last month (KD ${lastMonthRevenue.toFixed(3)}).`);
  } else if (thisMonthRevenue > 0) {
    reason.push("No revenue last month — this month's sales are entirely new activity.");
  }

  return {
    score,
    confidence: confidenceFromSampleSize(totalOrders, 30),
    reason,
    lastUpdated: new Date().toISOString(),
  };
}
