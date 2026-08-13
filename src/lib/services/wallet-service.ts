import { prisma } from "@/lib/prisma";

/**
 * WalletService — Phase 6.5
 *
 * Every balance change writes a WalletTransaction row — the real audit
 * trail a customer or admin can always reconcile against.
 */
export class InsufficientWalletBalanceError extends Error {
  constructor() {
    super("Insufficient wallet balance.");
    this.name = "InsufficientWalletBalanceError";
  }
}

export class WalletService {
  static async getOrCreateWallet(userId: string) {
    return prisma.saveoWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
  }

  static async credit(userId: string, amount: number, reason: string) {
    if (amount <= 0) throw new Error("Credit amount must be positive.");
    const wallet = await this.getOrCreateWallet(userId);
    return prisma.$transaction([
      prisma.saveoWallet.update({ where: { userId }, data: { balance: { increment: amount } } }),
      prisma.walletTransaction.create({ data: { walletId: wallet.id, type: "CREDIT", amount, reason } }),
    ]);
  }

  static async debit(userId: string, amount: number, reason: string) {
    if (amount <= 0) throw new Error("Debit amount must be positive.");
    const wallet = await this.getOrCreateWallet(userId);
    if (Number(wallet.balance) < amount) throw new InsufficientWalletBalanceError();
    return prisma.$transaction([
      prisma.saveoWallet.update({ where: { userId }, data: { balance: { decrement: amount } } }),
      prisma.walletTransaction.create({ data: { walletId: wallet.id, type: "DEBIT", amount, reason } }),
    ]);
  }

  static async getHistory(userId: string, take = 50) {
    const wallet = await this.getOrCreateWallet(userId);
    return prisma.walletTransaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: "desc" }, take });
  }
}
