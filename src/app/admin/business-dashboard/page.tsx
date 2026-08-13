import { BusinessDashboardService } from "@/lib/services/business-dashboard-service";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function BusinessDashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period } = await searchParams;
  const periodDays = period === "7" ? 7 : period === "90" ? 90 : period === "365" ? 365 : 30;

  const [kpis, dailyTrend, topSuppliers] = await Promise.all([
    BusinessDashboardService.getKPIs(periodDays),
    BusinessDashboardService.getDailyTrend(periodDays),
    BusinessDashboardService.getTopSuppliers(),
  ]);

  const maxGmv = Math.max(...dailyTrend.map((d) => d.gmv), 1);
  const PERIODS = [{ v: "7", l: "Weekly" }, { v: "30", l: "Monthly" }, { v: "90", l: "Quarterly" }, { v: "365", l: "Yearly" }];

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Business Dashboard" }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">CEO Business Dashboard</h1>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <a key={p.v} href={`?period=${p.v}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${periodDays.toString() === p.v ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
              {p.l}
            </a>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">GMV</p><p className="text-lg font-black">{formatKWD(kpis.gmv)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Revenue</p><p className="text-lg font-black">{formatKWD(kpis.realizedRevenue)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Net Profit</p><p className={`text-lg font-black ${kpis.netProfit >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{formatKWD(kpis.netProfit)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Orders</p><p className="text-lg font-black">{kpis.totalOrders}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Customers</p><p className="text-lg font-black">{kpis.totalCustomers}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Repeat Purchase Rate</p><p className="text-lg font-black">{kpis.repeatPurchaseRate}%</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Avg Basket Value</p><p className="text-lg font-black">{formatKWD(kpis.averageBasketValue)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Supplier Payout</p><p className="text-lg font-black">{formatKWD(kpis.supplierPayout)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Brand Revenue</p><p className="text-lg font-black">{formatKWD(kpis.brandRevenue)}</p></div>
      </div>

      <section className="mb-6 card p-5">
        <h2 className="mb-4 font-bold text-saveo-emerald-700">GMV Trend</h2>
        <div className="flex h-40 items-end gap-1">
          {dailyTrend.map((d) => (
            <div key={d.date} className="group relative flex-1">
              <div
                className="rounded-t bg-saveo-emerald-500 transition-all hover:bg-saveo-emerald-700"
                style={{ height: `${Math.max(4, (d.gmv / maxGmv) * 100)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                {d.date}: {formatKWD(d.gmv)}
              </div>
            </div>
          ))}
          {dailyTrend.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No orders in this period.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">🏆 Top Suppliers (Supplier Performance)</h2>
        <div className="space-y-1.5 text-sm">
          {topSuppliers.map((s, i) => (
            <div key={i} className="flex justify-between">
              <span>{i + 1}. {s.name}</span>
              <span className="font-semibold">{formatKWD(s.revenue)} · {formatKWD(s.commission)} commission</span>
            </div>
          ))}
          {topSuppliers.length === 0 && <p className="text-saveo-emerald-700/40">No realized sales yet.</p>}
        </div>
      </section>
    </div>
  );
}
