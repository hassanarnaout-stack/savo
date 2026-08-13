import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { Receipt } from "lucide-react";
import { SupplierWalletService } from "@/lib/services/supplier-wallet-service";
import { WalletWidget } from "@/components/supplier/wallet-widget";

export default async function SupplierSettlementsPage() {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/settlements");
      case "WRONG_ROLE":
        redirect("/");
      case "NO_SUPPLIER_PROFILE":
        redirect("/supplier/register");
      case "PENDING":
        redirect("/supplier/pending");
      case "REJECTED":
        redirect("/supplier/rejected");
      case "SUSPENDED":
        redirect("/supplier/suspended");
    }
  }
  const { supplier } = gate;

  const [wallet, settlements] = await Promise.all([
    SupplierWalletService.getWallet(supplier.id),
    prisma.supplierPayout.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-saveo-emerald-700">Settlement History</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Payout batches from Savo covering your settled commission transactions.
      </p>

      <WalletWidget balance={Number(wallet.balance)} pendingAmount={Number(wallet.pendingAmount)} paidAmount={Number(wallet.paidAmount)} />

      {settlements.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Receipt className="h-10 w-10 text-saveo-emerald-700/30" />
          <p className="font-semibold text-saveo-emerald-700">No settlements yet</p>
          <p className="max-w-sm text-sm text-saveo-emerald-700/50">
            Savo batches your paid commissions into periodic settlements. Once your first payout run happens,
            it will appear here with a reference number you can reconcile against your bank statement.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
              <tr>
                <th className="px-4 py-3">Settlement Date</th>
                <th className="px-4 py-3">Reference #</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 text-saveo-emerald-700/60">
                    {s.paidAt ? new Date(s.paidAt).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{s.referenceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-saveo-emerald-700/60">
                    {new Date(s.periodStart).toLocaleDateString("en-GB")} – {new Date(s.periodEnd).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">{s.ordersCount}</td>
                  <td className="px-4 py-3 font-semibold">{formatKWD(Number(s.netPayout))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        s.status === "PAID" ? "bg-saveo-emerald-100 text-saveo-emerald-800" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
