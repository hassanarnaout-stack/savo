import { prisma } from "@/lib/prisma";
import { SupplierWalletService } from "@/lib/services/supplier-wallet-service";

/**
 * RefundEngine — Phase 6.3
 *
 * "Customer refund → commission reversal → supplier balance update →
 * reports update" — each step reuses existing, already-verified
 * machinery rather than reimplementing the math:
 *   - Commission reversal: a REFUND ledger entry (Phase 5.5, verified)
 *     exactly reverses what the supplier was credited for the returned
 *     portion.
 *   - Supplier balance: SupplierWalletService.syncBalance (Phase 6.2)
 *     recomputes from the ledger, so it's automatically correct after
 *     the REFUND entry lands.
 *   - Reports: every report reading from the ledger/wallet picks this
 *     up automatically.
 */
export class RefundEngine {
  static async approveAndProcess(returnRequestId: string, adminUserId: string) {
    const returnRequest = await prisma.returnRequest.findUniqueOrThrow({
      where: { id: returnRequestId },
      include: {
        order: {
          include: {
            supplierOrders: true,
            paymentTransactions: { where: { status: { in: ["PAID", "AUTHORIZED"] } } },
          },
        },
      },
    });

    if (returnRequest.status === "COMPLETED") {
      throw new Error("This return has already been processed.");
    }

    await prisma.$transaction(async (tx) => {
      for (const supplierOrder of returnRequest.order.supplierOrders) {
        const netPayout = Number(supplierOrder.subtotal) - Number(supplierOrder.commissionAmount);
        if (netPayout === 0) continue;
        await tx.supplierLedgerEntry.create({
          data: {
            supplierId: supplierOrder.supplierId,
            type: "REFUND",
            amount: -netPayout,
            description: `Return processed for order ${returnRequest.orderId}`,
            supplierOrderId: supplierOrder.id,
            createdByUserId: adminUserId,
          },
        });
      }

      for (const txn of returnRequest.order.paymentTransactions) {
        await tx.paymentTransaction.update({ where: { id: txn.id }, data: { status: "REFUNDED" } });
      }

      await tx.returnRequest.update({
        where: { id: returnRequestId },
        data: { status: "COMPLETED", resolvedAt: new Date() },
      });
    });

    const supplierIds = [...new Set(returnRequest.order.supplierOrders.map((so) => so.supplierId))];
    for (const supplierId of supplierIds) {
      await SupplierWalletService.syncBalance(supplierId);
    }

    return returnRequest;
  }

  static async reject(returnRequestId: string, adminNotes?: string) {
    return prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: { status: "REJECTED", adminNotes, resolvedAt: new Date() },
    });
  }
}
