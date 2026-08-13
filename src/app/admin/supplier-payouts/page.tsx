import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { PayoutApprovalControls } from "@/components/admin/payout-approval-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminSupplierPayoutsPage() {
  const payouts = await prisma.supplierPayout.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { supplier: { select: { companyName: true } } },
  });

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Supplier Payouts" }]} />
      <h1 className="mb-2 text-2xl font-bold">Pending Payout Requests</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">{payouts.length} request(s) awaiting approval.</p>

      <div className="space-y-3">
        {payouts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-black/5 bg-white p-4">
            <div>
              <p className="font-semibold">{p.supplier.companyName}</p>
              <p className="text-xs text-saveo-emerald-700/50">
                Requested {new Date(p.createdAt).toLocaleDateString("en-GB")} · <strong>{formatKWD(Number(p.netPayout))}</strong>
              </p>
            </div>
            <PayoutApprovalControls payoutId={p.id} />
          </div>
        ))}
        {payouts.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No pending payout requests.
          </div>
        )}
      </div>
    </div>
  );
}
