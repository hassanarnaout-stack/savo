import { BusinessDashboardService } from "@/lib/services/business-dashboard-service";
import { BICustomerAnalyticsService } from "@/lib/services/bi-customer-analytics-service";
import { BICatalogAnalyticsService } from "@/lib/services/bi-catalog-analytics-service";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { ReportExportButton } from "@/components/admin/report-export-button";
import { RunBIRollupButton } from "@/components/admin/run-bi-rollup-button";

export default async function BusinessIntelligencePage() {
  const [kpis, ltv, rfm, cohorts, funnel, topCategories, topBrands, salesByHour, salesByRegion, monthlyComparison, forecast] = await Promise.all([
    BusinessDashboardService.getKPIs(30),
    BICustomerAnalyticsService.getCustomerLTV(15),
    BICustomerAnalyticsService.getRFMAnalysis(),
    BICustomerAnalyticsService.getCohortAnalysis(6),
    BICustomerAnalyticsService.getFunnelAnalysis(30),
    BICatalogAnalyticsService.getTopCategories(10),
    BICatalogAnalyticsService.getTopBrands(10),
    BICatalogAnalyticsService.getSalesByHour(30),
    BICatalogAnalyticsService.getSalesByRegion(30),
    BICatalogAnalyticsService.getMonthlyComparison(),
    BICatalogAnalyticsService.getForecast(7),
  ]);

  const segmentCounts = rfm.reduce((acc, r) => { acc[r.segment] = (acc[r.segment] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const maxHourRevenue = Math.max(...salesByHour.map((h) => h.revenue), 1);
  const churnedCount = rfm.filter((r) => r.segment === "Lost" || r.segment === "At Risk").length;
  const retentionRate = rfm.length > 0 ? Number((((rfm.length - churnedCount) / rfm.length) * 100).toFixed(1)) : 0;

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Business Intelligence" }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Business Intelligence</h1>
        <RunBIRollupButton />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">GMV</p><p className="text-lg font-black">{formatKWD(kpis.gmv)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Net Revenue</p><p className="text-lg font-black">{formatKWD(kpis.realizedRevenue)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Gross Profit</p><p className="text-lg font-black">{formatKWD(kpis.netProfit)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Avg. LTV</p><p className="text-lg font-black">{formatKWD(ltv.averageLTV)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Repeat Rate</p><p className="text-lg font-black">{kpis.repeatPurchaseRate}%</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Retention (RFM)</p><p className="text-lg font-black">{retentionRate}%</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">AOV</p><p className="text-lg font-black">{formatKWD(kpis.averageBasketValue)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Conversion</p><p className="text-lg font-black">{funnel.at(-1)?.conversionFromStart ?? 0}%</p></div>
      </div>

      <section className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">📅 Monthly &amp; Year Comparison</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <div><p className="text-xs text-saveo-emerald-700/50">This Month GMV</p><p className="font-bold">{formatKWD(Number(monthlyComparison.thisMonth?.gmv ?? 0))}</p></div>
          <div><p className="text-xs text-saveo-emerald-700/50">vs Last Month</p><p className={`font-bold ${(monthlyComparison.momChange ?? 0) >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{monthlyComparison.momChange ?? "—"}%</p></div>
          <div><p className="text-xs text-saveo-emerald-700/50">vs Last Year</p><p className={`font-bold ${(monthlyComparison.yoyChange ?? 0) >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{monthlyComparison.yoyChange ?? "—"}%</p></div>
          <div><p className="text-xs text-saveo-emerald-700/50">7-Day Forecast (naive trend)</p><p className="font-bold">{forecast.length > 0 ? formatKWD(forecast.at(-1)!.projectedGMV) : "—"}</p></div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">🎯 RFM Segments</h2>
            <ReportExportButton filename="rfm-analysis" rows={rfm.map((r) => ({ Customer: r.name, Recency: r.recencyDays, Frequency: r.frequency, Monetary: r.monetary, Segment: r.segment }))} />
          </div>
          <div className="space-y-1.5 text-sm">
            {Object.entries(segmentCounts).sort((a, b) => b[1] - a[1]).map(([segment, count]) => (
              <div key={segment} className="flex justify-between"><span>{segment}</span><span className="font-semibold">{count} customers</span></div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">🔻 Funnel (30 days)</h2>
            <ReportExportButton filename="funnel-analysis" rows={funnel.map((f) => ({ Step: f.name, Count: f.count, "% of Previous": f.conversionFromPrevious, "% of Start": f.conversionFromStart }))} />
          </div>
          <div className="space-y-1.5 text-sm">
            {funnel.map((f) => (
              <div key={f.name} className="flex justify-between"><span>{f.name}</span><span className="font-semibold">{f.count} ({f.conversionFromStart}%)</span></div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">👑 Top Customers (LTV)</h2>
            <ReportExportButton filename="top-customers" rows={ltv.topCustomers.map((c) => ({ Customer: c.name, LTV: c.ltv, Orders: c.orderCount }))} />
          </div>
          <div className="space-y-1.5 text-sm">
            {ltv.topCustomers.slice(0, 8).map((c, i) => (
              <div key={c.userId} className="flex justify-between"><span>{i + 1}. {c.name}</span><span className="font-semibold">{formatKWD(c.ltv)}</span></div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">🏆 Top Categories</h2>
            <ReportExportButton filename="top-categories" rows={topCategories.map((c) => ({ Category: c.name, Revenue: c.revenue, UnitsSold: c.unitsSold }))} />
          </div>
          <div className="space-y-1.5 text-sm">
            {topCategories.map((c, i) => (
              <div key={c.name} className="flex justify-between"><span>{i + 1}. {c.name}</span><span className="font-semibold">{formatKWD(c.revenue)}</span></div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">🏷️ Top Brands</h2>
            <ReportExportButton filename="top-brands" rows={topBrands.map((b) => ({ Brand: b.name, Revenue: b.revenue }))} />
          </div>
          <div className="space-y-1.5 text-sm">
            {topBrands.map((b, i) => (
              <div key={b.name} className="flex justify-between"><span>{i + 1}. {b.name}</span><span className="font-semibold">{formatKWD(b.revenue)}</span></div>
            ))}
            {topBrands.length === 0 && <p className="text-saveo-emerald-700/40">No paid brand invoices yet.</p>}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">📍 Sales by Region</h2>
            <ReportExportButton filename="sales-by-region" rows={salesByRegion.map((r) => ({ Region: r.region, Orders: r.orders, Revenue: r.revenue }))} />
          </div>
          <div className="space-y-1.5 text-sm">
            {salesByRegion.map((r) => (
              <div key={r.region} className="flex justify-between"><span>{r.region}</span><span className="font-semibold">{r.orders} orders · {formatKWD(r.revenue)}</span></div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-saveo-emerald-700">🕐 Sales by Hour (Heat Map)</h2>
          <ReportExportButton filename="sales-by-hour" rows={salesByHour.map((h) => ({ Hour: h.hour, Orders: h.orders, Revenue: h.revenue }))} />
        </div>
        <div className="flex h-24 items-end gap-1">
          {salesByHour.map((h) => (
            <div key={h.hour} className="group relative flex-1">
              <div
                className="rounded-t bg-saveo-gold-400 transition-all hover:bg-saveo-gold-600"
                style={{ height: `${Math.max(4, (h.revenue / maxHourRevenue) * 100)}%`, opacity: 0.4 + (h.revenue / maxHourRevenue) * 0.6 }}
              />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-saveo-emerald-700/40">{h.hour}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 card overflow-x-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-saveo-emerald-700">📈 Cohort Retention</h2>
          <ReportExportButton filename="cohort-analysis" rows={cohorts.map((c) => ({ Cohort: c.cohortMonth, Size: c.size, ...Object.fromEntries(c.retentionByMonth.map((v, i) => [`Month ${i}`, v])) }))} />
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-saveo-emerald-700/50">
              <th className="p-1.5 text-left">Cohort</th>
              <th className="p-1.5">Size</th>
              {cohorts[0]?.retentionByMonth.map((_, i) => <th key={i} className="p-1.5">M{i}</th>)}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.cohortMonth} className="border-t border-black/5">
                <td className="p-1.5 font-medium">{c.cohortMonth}</td>
                <td className="p-1.5 text-center">{c.size}</td>
                {c.retentionByMonth.map((v, i) => (
                  <td key={i} className="p-1.5 text-center" style={{ backgroundColor: v > 0 ? `rgba(11,61,46,${v / 100})` : undefined, color: v > 50 ? "white" : undefined }}>
                    {v > 0 ? `${v}%` : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
