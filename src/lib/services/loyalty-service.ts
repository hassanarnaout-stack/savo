import { prisma } from "@/lib/prisma";
import { WalletService } from "@/lib/services/wallet-service";

/**
 * LoyaltyService — Phase 6.5
 *
 * Earning rate: 1 point per 1.000 KD spent (rounded down) — tied to
 * real order totals, awarded once at order completion. Redemption:
 * 100 points = 1.000 KD real wallet credit — a fixed, transparent
 * conversion rate.
 */
const POINTS_PER_KD = 1;
const POINTS_TO_KD_RATE = 100;

export class InsufficientPointsError extends Error {
  constructor() {
    super("Insufficient points balance.");
    this.name = "InsufficientPointsError";
  }
}

export class LoyaltyService {
  static async getOrCreateAccount(userId: string) {
    return prisma.saveoPoints.upsert({
      where: { userId },
      create: { userId, points: 0, lifetimePoints: 0 },
      update: {},
    });
  }

  static async earnFromOrder(userId: string, orderTotal: number, orderId: string) {
    const points = Math.floor(orderTotal * POINTS_PER_KD);
    if (points <= 0) return null;

    const account = await this.getOrCreateAccount(userId);
    return prisma.$transaction([
      prisma.saveoPoints.update({
        where: { userId },
        data: { points: { increment: points }, lifetimePoints: { increment: points } },
      }),
      prisma.pointsTransaction.create({
        data: { pointsId: account.id, type: "EARNED", points, reason: `Order ${orderId}` },
      }),
    ]);
  }

  static async redeemForWalletCredit(userId: string, points: number) {
    if (points <= 0) throw new Error("Points to redeem must be positive.");
    const account = await this.getOrCreateAccount(userId);
    if (account.points < points) throw new InsufficientPointsError();

    const kdValue = Number((points / POINTS_TO_KD_RATE).toFixed(3));

    await prisma.$transaction([
      prisma.saveoPoints.update({ where: { userId }, data: { points: { decrement: points } } }),
      prisma.pointsTransaction.create({
        data: { pointsId: account.id, type: "REDEEMED", points, reason: `Redeemed for KD ${kdValue.toFixed(3)} wallet credit` },
      }),
    ]);

    await WalletService.credit(userId, kdValue, `Redeemed ${points} loyalty points`);

    return { pointsRedeemed: points, kdCredited: kdValue };
  }

  static async getHistory(userId: string, take = 50) {
    const account = await this.getOrCreateAccount(userId);
    return prisma.pointsTransaction.findMany({ where: { pointsId: account.id }, orderBy: { createdAt: "desc" }, take });
  }
}
