import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * SupplierLedgerService — Phase 5.5
 *
 * See the schema doc comment on SupplierLedgerEntry for the sign
 * convention and how this relates to (and doesn't replace) the existing
 * SupplierTransaction / GMV-vs-Realized-Sales system from Phase 3.4.
 */
export class SupplierLedgerService {
  /** Auto-generates the SALE (+) and COMMISSION (-) pair at the moment an order's sale becomes realized (DELIVERED). Called from within the same transaction as that status change. */
  static async recordSale(
    tx: Tx,
    params: { supplierId: string; supplierOrderId: string; saleAmount: number; commissionAmount: number }
  ) {
    await tx.supplierLedgerEntry.createMany({
      data: [
        {
          supplierId: params.supplierId,
          type: "SALE",
          amount: params.saleAmount,
          description: `Sale — order ${params.supplierOrderId}`,
          supplierOrderId: params.supplierOrderId,
        },
        {
          supplierId: params.supplierId,
          type: "COMMISSION",
          amount: -params.commissionAmount,
          description: `Commission — order ${params.supplierOrderId}`,
          supplierOrderId: params.supplierOrderId,
        },
      ],
    });
  }

  static async recordManualEntry(params: {
    supplierId: string;
    type: "REFUND" | "ADJUSTMENT" | "PAYOUT";
    amount: number; // caller supplies the correctly-signed amount
    description: string;
    createdByUserId: string;
  }) {
    return prisma.supplierLedgerEntry.create({
      data: {
        supplierId: params.supplierId,
        type: params.type,
        amount: params.amount,
        description: params.description,
        createdByUserId: params.createdByUserId,
      },
    });
  }

  /** Current amount owed to this supplier — the running sum of all their ledger entries. */
  static async getPayable(supplierId: string): Promise<number> {
    const agg = await prisma.supplierLedgerEntry.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  static async getLedger(supplierId: string, take = 50) {
    return prisma.supplierLedgerEntry.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  /** Total payable across every supplier — used on the Finance dashboard. */
  static async getTotalPayables(): Promise<number> {
    const agg = await prisma.supplierLedgerEntry.aggregate({ _sum: { amount: true } });
    return Number(agg._sum.amount ?? 0);
  }
}
