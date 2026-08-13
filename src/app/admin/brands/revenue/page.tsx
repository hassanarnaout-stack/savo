import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function BrandRevenueDashboardPage() {
  const [invoicesByType, topBrands, campaigns] = await Promise.all([
    prisma.brandInvoice.groupBy({ by: ["type"], where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.brandAccount.findMany({
      select: { id: true, companyName: true, invoices: { where: { status: "PAID" }, select: { amount: true } } },
    }),
    prisma.brandMarketingCampaign.findMany({
      include: { brand: { select: { companyName: true } }, events: { select: { eventType: true, metadata: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const adRevenue = invoicesByType.filter((i) => i.type !== "SUBSCRIPTION").reduce((s, i) => s + Number(i._sum.amount ?? 0), 0);
  const subscriptionRevenue = Number(invoicesByType.find((i) => i.type === "SUBSCRIPTION")?._sum.amount ?? 0);

  const brandRevenue = topBrands
    .map((b) => ({ name: b.companyName, revenue: b.invoices.reduce((s, i) => s + Number(i.amount), 0) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const campaignPerformance = campaigns.map((c) => {
    const views = c.events.filter((e) => e.eventType === "IMPRESSION").length;
    const purchases = c.events.filter((e) => e.eventType === "PURCHASE");
    const revenue = purchases.reduce((s, e) => s + (typeof (e.metadata as any)?.orderTotal === "number" ? (e.metadata as any).orderTotal : 0), 0);
    const cost = Number(c.budget);
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    return { name: `${c.brand.companyName} — ${c.type.replace(/_/g, " ")}`, views, revenue, roi };
  }).sort((a, b) => b.roi - a.roi).slice(0, 10);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Brands", href: "/admin/brands" }, { label: "Revenue" }]} />
      <h1 className="mb-6 text-2xl font-bold">Brand Revenue Dashboard</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-xs text-saveo-emerald-700/50">Advertising Revenue (sponsored/campaigns/takeovers/box sponsorships)</p>
          <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(adRevenue)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-saveo-emerald-700/50">Subscription Revenue</p>
          <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(subscriptionRevenue)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">🏆 Top Brands by Revenue</h2>
          <div className="space-y-1.5">
            {brandRevenue.map((b, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{i + 1}. {b.name}</span>
                <span className="font-semibold">{formatKWD(b.revenue)}</span>
              </div>
            ))}
            {brandRevenue.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No revenue yet.</p>}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">📈 Top Campaigns by ROI</h2>
          <div className="space-y-1.5">
            {campaignPerformance.map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="truncate">{i + 1}. {c.name}</span>
                <span className={`font-semibold ${c.roi >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{c.roi.toFixed(1)}%</span>
              </div>
            ))}
            {campaignPerformance.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No campaigns yet.</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Revenue by Type</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {invoicesByType.map((i) => (
            <div key={i.type}>
              <p className="text-[10px] text-saveo-emerald-700/50">{i.type.replace(/_/g, " ")}</p>
              <p className="font-bold">{formatKWD(Number(i._sum.amount ?? 0))}</p>
              <p className="text-[10px] text-saveo-emerald-700/40">{i._count} invoices</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
