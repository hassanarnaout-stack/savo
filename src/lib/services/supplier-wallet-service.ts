import { prisma } from "@/lib/prisma";
import { SupplierLedgerService } from "@/lib/services/supplier-ledger-service";

/**
 * SupplierWalletService — Phase 6.2
 *
 * Order Completed → commission calculated (SupplierLedgerService,
 * already built in Phase 5.5) → supplier balance → withdrawal request →
 * admin approval → paid. This service is the withdrawal-request layer
 * on top of that existing, verified ledger — it never recomputes the
 * ledger math itself.
 */
export class InsufficientBalanceError extends Error {
  constructor() {
    super("Requested amount exceeds available wallet balance.");
    this.name = "InsufficientBalanceError";
  }
}

export class SupplierWalletService {
  /** Recomputes `balance` from the ledger — the one place this ever happens, so it never drifts from SupplierLedgerService's own math. */
  static async syncBalance(supplierId: string) {
    const payable = await SupplierLedgerService.getPayable(supplierId);
    const wallet = await prisma.supplierWallet.upsert({
      where: { supplierId },
      create: { supplierId, balance: 0, pendingAmount: 0, paidAmount: 0 },
      update: {},
    });
    const balance = payable - Number(wallet.pendingAmount);
    return prisma.supplierWallet.update({ where: { supplierId }, data: { balance } });
  }

  static async getWallet(supplierId: string) {
    return this.syncBalance(supplierId);
  }

  /** Supplier-initiated withdrawal request. */
  static async requestPayout(supplierId: string, amount: number) {
    const wallet = await this.syncBalance(supplierId);
    if (amount <= 0 || amount > Number(wallet.balance)) {
      throw new InsufficientBalanceError();
    }

    const now = new Date();
    const [payout] = await prisma.$transaction([
      prisma.supplierPayout.create({
        data: {
          supplierId,
          periodStart: now,
          periodEnd: now,
          grossSales: 0,
          commission: 0,
          netPayout: amount,
          status: "PENDING",
        },
      }),
      prisma.supplierWallet.update({
        where: { supplierId },
        data: { pendingAmount: { increment: amount }, balance: { decrement: amount } },
      }),
    ]);

    return payout;
  }

  /** Admin approval — marks PAID, moves pendingAmount to paidAmount, records a real PAYOUT ledger entry. */
  static async approvePayout(payoutId: string, referenceNumber: string, approvedByUserId: string) {
    const payout = await prisma.supplierPayout.findUniqueOrThrow({ where: { id: payoutId } });
    if (payout.status === "PAID") {
      throw new Error("This payout has already been paid.");
    }

    await prisma.$transaction([
      prisma.supplierPayout.update({
        where: { id: payoutId },
        data: { status: "PAID", paidAt: new Date(), referenceNumber },
      }),
      prisma.supplierWallet.update({
        where: { supplierId: payout.supplierId },
        data: { pendingAmount: { decrement: Number(payout.netPayout) }, paidAmount: { increment: Number(payout.netPayout) } },
      }),
    ]);

    await SupplierLedgerService.recordManualEntry({
      supplierId: payout.supplierId,
      type: "PAYOUT",
      amount: -Number(payout.netPayout),
      description: `Payout ${referenceNumber}`,
      createdByUserId: approvedByUserId,
    });

    return prisma.supplierPayout.findUniqueOrThrow({ where: { id: payoutId } });
  }

  static async rejectPayout(payoutId: string) {
    const payout = await prisma.supplierPayout.findUniqueOrThrow({ where: { id: payoutId } });
    if (payout.status === "PAID") {
      throw new Error("This payout has already been paid and cannot be rejected.");
    }

    await prisma.$transaction([
      prisma.supplierPayout.delete({ where: { id: payoutId } }),
      prisma.supplierWallet.update({
        where: { supplierId: payout.supplierId },
        data: { pendingAmount: { decrement: Number(payout.netPayout) }, balance: { increment: Number(payout.netPayout) } },
      }),
    ]);
  }
}
