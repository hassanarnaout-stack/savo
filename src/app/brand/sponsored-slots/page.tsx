import { redirect } from "next/navigation";
import { getBrandAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SponsoredROIService } from "@/lib/services/sponsored-roi-service";
import { formatKWD } from "@/lib/utils";
import { CreateSponsoredSlotForm } from "@/components/brand/create-sponsored-slot-form";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-black/5 text-saveo-emerald-700/60",
  ACTIVE: "bg-saveo-emerald-100 text-saveo-emerald-800",
  PAUSED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
};

export default async function BrandSponsoredSlotsPage() {
  const gate = await getBrandAccountGate();
  if (!gate.ok) redirect("/brand");
  const { brand } = gate;

  const [products, slots, roi] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", approvalStatus: "APPROVED" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
    prisma.sponsoredSlot.findMany({ where: { brandId: brand.id }, include: { product: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    SponsoredROIService.getForBrand(brand.id),
  ]);

  const roiBySlotId = new Map(roi.map((r) => [r.slotId, r]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-saveo-emerald-700">Sponsored Products</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Buy visibility for any product across the marketplace — homepage, search, category pages, trending, and recommendations. Every campaign is reviewed before it goes live, and sponsored placements are always labeled "Sponsored" — never mixed into organic ranking silently.
      </p>

      <div className="mb-8 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">New Campaign</h2>
        <CreateSponsoredSlotForm products={products} />
      </div>

      <section>
        <h2 className="mb-3 font-bold text-saveo-emerald-700">📊 Your Campaigns &amp; ROI</h2>
        <div className="space-y-3">
          {slots.map((slot) => {
            const r = roiBySlotId.get(slot.id);
            return (
              <div key={slot.id} className="rounded-xl2 border border-black/5 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{slot.product.name} — {slot.placementType.replace(/_/g, " ")}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[slot.status]}`}>{slot.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-saveo-emerald-700/70 sm:grid-cols-4">
                  <div><p className="opacity-50">Spent / Budget</p><p className="font-semibold">{formatKWD(Number(slot.spentTotal))} / {formatKWD(Number(slot.budget))}</p></div>
                  <div><p className="opacity-50">Impressions / Clicks</p><p className="font-semibold">{r?.impressions ?? 0} / {r?.clicks ?? 0}</p></div>
                  <div><p className="opacity-50">CTR</p><p className="font-semibold">{r?.ctr !== null && r?.ctr !== undefined ? `${r.ctr}%` : "—"}</p></div>
                  <div><p className="opacity-50">ROI</p><p className={`font-semibold ${r?.roi !== null && r?.roi !== undefined && r.roi >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{r?.roi !== null && r?.roi !== undefined ? `${r.roi}%` : "—"}</p></div>
                </div>
                <p className="mt-2 text-xs text-saveo-emerald-700/50">{r?.attributedOrders ?? 0} attributed order(s), {formatKWD(r?.attributedRevenue ?? 0)} attributed revenue (24h last-click window)</p>
              </div>
            );
          })}
          {slots.length === 0 && (
            <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
              No sponsored campaigns yet — create one above.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
