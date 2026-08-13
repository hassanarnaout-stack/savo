import { prisma } from "@/lib/prisma";
import { SupplierLedgerService } from "@/lib/services/supplier-ledger-service";
import { formatKWD } from "@/lib/utils";
import { AddExpenseForm, AddLedgerEntryForm } from "@/components/admin/finance-controls";

/**
 * Finance Center — Phase 5.5
 *
 * Definitions (Saveo is a commission marketplace — it never holds
 * inventory, so there's no traditional COGS):
 *   Revenue      = total commission earned on REALIZED sales (SupplierTransaction.status = COMPLETED)
 *   Gross Profit = Revenue (commission IS the margin in this business model — no COGS to subtract)
 *   Net Profit   = Gross Profit − Expenses (marketing, salaries, ops, etc.)
 *   Payables     = running balance across every supplier's ledger — what Saveo currently owes them
 */
export default async function AdminFinancePage() {
  const [realizedTransactions, expenses, totalPayables, suppliers] = await Promise.all([
    prisma.supplierTransaction.findMany({
      where: { status: { in: ["COMPLETED", "SETTLED"] } },
      select: { commissionAmount: true },
    }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 30 }),
    SupplierLedgerService.getTotalPayables(),
    prisma.supplier.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
  ]);

  const revenue = realizedTransactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
  const grossProfit = revenue; // no COGS in a commission marketplace — see doc comment above
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = grossProfit - totalExpenses;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Finance Center</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl2 border border-black/5 bg-white p-5">
          <p className="text-xs text-saveo-emerald-700/50">Revenue</p>
          <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(revenue)}</p>
        </div>
        <div className="rounded-xl2 border border-black/5 bg-white p-5">
          <p className="text-xs text-saveo-emerald-700/50">Gross Profit</p>
          <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(grossProfit)}</p>
        </div>
        <div className="rounded-xl2 border border-black/5 bg-white p-5">
          <p className="text-xs text-saveo-emerald-700/50">Net Profit</p>
          <p className={`text-2xl font-black ${netProfit >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{formatKWD(netProfit)}</p>
        </div>
        <div className="rounded-xl2 border border-black/5 bg-white p-5">
          <p className="text-xs text-saveo-emerald-700/50">Supplier Payables</p>
          <p className="text-2xl font-black text-amber-600">{formatKWD(totalPayables)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold">Expenses</h2>
          <AddExpenseForm />
          <div className="mt-4 space-y-1.5">
            {expenses.map((e) => (
              <div key={e.id} className="flex justify-between text-sm">
                <span>{e.category} {e.notes && <span className="text-saveo-emerald-700/40">· {e.notes}</span>}</span>
                <span className="font-semibold">{formatKWD(Number(e.amount))}</span>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No expenses recorded yet.</p>}
          </div>
        </section>

        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold">Manual Ledger Entry</h2>
          <p className="mb-3 text-xs text-saveo-emerald-700/50">
            REFUND and PAYOUT should be entered as negative amounts (they reduce what's owed). ADJUSTMENT can be either sign.
          </p>
          <AddLedgerEntryForm suppliers={suppliers} />
        </section>
      </div>
    </div>
  );
}
