import { prisma } from "@/lib/prisma";

/**
 * DealOfTheHourService — fills a real gap: this model already existed
 * and was already displayed on the homepage (getDealOfTheHour in
 * discovery-engine.ts), but had zero admin UI to actually create or
 * manage one. Deactivating any currently-active slot when creating a
 * new one keeps the "single rotating spotlight" behavior genuine.
 */
export class DealOfTheHourService {
  static async create(params: {
    productId: string;
    startTime: Date;
    endTime: Date;
    discountOverride?: number;
    stockLimit: number;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.dealOfTheHour.updateMany({ where: { isActive: true }, data: { isActive: false } });
      return tx.dealOfTheHour.create({ data: { ...params, isActive: true } });
    });
  }

  static async deactivate(id: string) {
    return prisma.dealOfTheHour.update({ where: { id }, data: { isActive: false } });
  }

  static async getAll(limit = 20) {
    return prisma.dealOfTheHour.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { product: { select: { name: true, saveoPrice: true } } },
    });
  }
}
