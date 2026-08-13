import { prisma } from "@/lib/prisma";

/**
 * BadgeEngine — Phase 8.0 (Product Experience Studio)
 *
 * Every automatic badge is assigned from a real, existing signal — no
 * random/fake badges. Manual badges (isAutomatic: false) set by an
 * admin are never touched by recompute(); this only manages the
 * automatic set.
 */
export class BadgeEngine {
  private static async assign(productId: string, type: string, expiresAt?: Date) {
    await prisma.productBadge.upsert({
      where: { productId_type: { productId, type: type as any } },
      create: { productId, type: type as any, isAutomatic: true, expiresAt },
      update: { expiresAt },
    });
  }

  private static async unassignAutomatic(productId: string, type: string) {
    await prisma.productBadge.deleteMany({ where: { productId, type: type as any, isAutomatic: true } });
  }

  static async recomputeForProduct(productId: string) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: {
        createdAt: true, orderCount: true, soldQuantity: true, isMembersOnly: true,
        nutritionFact: { select: { sugarG: true, fatG: true, dietTags: true } },
      },
    });

    const daysSinceListed = Math.floor((Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceListed <= 30) await this.assign(productId, "NEW_ARRIVAL");
    else await this.unassignAutomatic(productId, "NEW_ARRIVAL");

    const [productCount, betterCount] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.product.count({ where: { status: "ACTIVE", orderCount: { gt: product.orderCount } } }),
    ]);
    const percentile = productCount > 0 ? betterCount / productCount : 1;
    if (product.orderCount > 0 && percentile <= 0.05) await this.assign(productId, "BEST_SELLER");
    else await this.unassignAutomatic(productId, "BEST_SELLER");

    const recentOrders = await prisma.orderItem.aggregate({
      where: { productId, supplierOrder: { order: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } } },
      _sum: { quantity: true },
    });
    const recentVelocity = (recentOrders._sum.quantity ?? 0) / 7;
    const overallVelocity = product.soldQuantity / Math.max(1, daysSinceListed);
    if (recentVelocity > overallVelocity * 1.5 && recentVelocity > 0) await this.assign(productId, "TRENDING");
    else await this.unassignAutomatic(productId, "TRENDING");

    if (product.isMembersOnly) await this.assign(productId, "SAVEO_PLUS");
    else await this.unassignAutomatic(productId, "SAVEO_PLUS");

    if (product.nutritionFact) {
      const isHealthy = (product.nutritionFact.sugarG ?? 99) < 5 && (product.nutritionFact.fatG ?? 99) < 3;
      if (isHealthy) await this.assign(productId, "HEALTHY_CHOICE");
      else await this.unassignAutomatic(productId, "HEALTHY_CHOICE");
    }

    return prisma.productBadge.findMany({ where: { productId } });
  }

  static async recomputeAll() {
    const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    let updated = 0;
    for (const p of products) {
      await this.recomputeForProduct(p.id).catch(() => {});
      updated++;
    }
    return { updated };
  }
}
