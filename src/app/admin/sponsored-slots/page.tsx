import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { SponsoredSlotApprovalButtons } from "@/components/admin/sponsored-slot-approval-buttons";

export default async function AdminSponsoredSlotsPage() {
  const [pending, active] = await Promise.all([
    prisma.sponsoredSlot.findMany({
      where: { status: "DRAFT", approvedAt: null },
      include: { brand: { select: { companyName: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sponsoredSlot.findMany({
      where: { status: "ACTIVE" },
      include: { brand: { select: { companyName: true } }, product: { select: { name: true } } },
      orderBy: { spentTotal: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Sponsored Slots" }]} />
      <h1 className="mb-1 text-2xl font-bold">Sponsored Products — Approvals</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        A slot never goes live automatically — every one requires this explicit approval, regardless of its date range.
      </p>

      <section className="mb-6">
        <h2 className="mb-3 font-bold text-amber-700">⏳ Pending Approval ({pending.length})</h2>
        <div className="space-y-2">
          {pending.map((slot) => (
            <div key={slot.id} className="rounded-xl2 border border-amber-200 bg-amber-50 p-4 text-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{slot.product.name} — {slot.brand.companyName}</p>
                  <p className="text-xs text-saveo-emerald-700/60">
                    {slot.placementType.replace(/_/g, " ")} · Budget {formatKWD(Number(slot.budget))}
                    {slot.cpc && ` · CPC ${formatKWD(Number(slot.cpc))}`}
                    {slot.cpm && ` · CPM ${formatKWD(Number(slot.cpm))}`}
                    {slot.dailySpendLimit && ` · Daily cap ${formatKWD(Number(slot.dailySpendLimit))}`}
                  </p>
                  <p className="text-xs text-saveo-emerald-700/50">{new Date(slot.startAt).toLocaleDateString("en-GB")} → {new Date(slot.endAt).toLocaleDateString("en-GB")}</p>
                </div>
                <SponsoredSlotApprovalButtons slotId={slot.id} />
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-sm text-saveo-emerald-700/40">Nothing waiting for approval.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-saveo-emerald-700">🟢 Active Slots (by spend)</h2>
        <div className="space-y-2">
          {active.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between rounded-xl2 border border-black/5 bg-white p-4 text-sm">
              <span>{slot.product.name} — {slot.brand.companyName} ({slot.placementType.replace(/_/g, " ")})</span>
              <span className="font-semibold">{formatKWD(Number(slot.spentTotal))} / {formatKWD(Number(slot.budget))}</span>
            </div>
          ))}
          {active.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No active sponsored slots right now.</p>}
        </div>
      </section>
    </div>
  );
}
