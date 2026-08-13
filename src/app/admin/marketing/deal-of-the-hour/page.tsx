import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { CreateDealOfHourForm, DeactivateDealButton } from "@/components/admin/deal-of-the-hour-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminDealOfTheHourPage() {
  const [deals, products] = await Promise.all([
    prisma.dealOfTheHour.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { product: { select: { name: true, saveoPrice: true } } },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", approvalStatus: "APPROVED" },
      select: { id: true, name: true, saveoPrice: true },
      orderBy: { name: "asc" },
      take: 300,
    }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Deal of the Hour" }]} />
      <h1 className="mb-6 text-2xl font-bold">Deal of the Hour</h1>

      <div className="mb-6">
        <CreateDealOfHourForm products={products.map((p) => ({ id: p.id, name: p.name, saveoPrice: Number(p.saveoPrice) }))} />
      </div>

      <div className="space-y-2">
        {deals.map((d) => {
          const now = new Date();
          const isLive = d.isActive && d.startTime <= now && d.endTime > now;
          return (
            <div key={d.id} className="flex items-center justify-between rounded-xl2 border border-black/5 bg-white p-4 text-sm">
              <div>
                <p className="font-semibold">{d.product.name}</p>
                <p className="text-xs text-saveo-emerald-700/50">
                  {formatKWD(Number(d.product.saveoPrice))} · {d.discountOverride ? `${d.discountOverride}% off` : "product's own discount"} · {d.buyersCount} bought ·{" "}
                  {new Date(d.startTime).toLocaleString("en-GB")} → {new Date(d.endTime).toLocaleString("en-GB")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isLive ? "bg-saveo-emerald-100 text-saveo-emerald-800" : "bg-black/5 text-saveo-emerald-700/50"}`}>
                  {isLive ? "LIVE NOW" : d.isActive ? "Scheduled/Expired" : "Inactive"}
                </span>
                {d.isActive && <DeactivateDealButton dealId={d.id} />}
              </div>
            </div>
          );
        })}
        {deals.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No Deal of the Hour has ever been created.
          </div>
        )}
      </div>
    </div>
  );
}
