import Link from "next/link";
import { ABCAnalysisService } from "@/lib/services/abc-analysis-service";
import { InventoryTurnoverService } from "@/lib/services/inventory-turnover-service";
import { EnterpriseSupplierKPIsService } from "@/lib/services/enterprise-supplier-kpis-service";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { ReportExportButton } from "@/components/admin/report-export-button";

const TIER_STYLES: Record<string, string> = {
  A: "bg-saveo-emerald-100 text-saveo-emerald-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-black/5 text-saveo-emerald-700/60",
};

export default async function EnterpriseAnalyticsPage() {
  const [abc, turnover, supplierKPIs] = await Promise.all([
    ABCAnalysisService.analyze(),
    InventoryTurnoverService.analyze(90),
    EnterpriseSupplierKPIsService.getAll(),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Enterprise Analytics" }]} />
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Enterprise Analytics</h1>
        <Link href="/admin/business-intelligence" className="text-sm font-semibold text-saveo-emerald-600 hover:underline">
          ← Data Warehouse, CLV, RFM, Cohorts, Funnel, Heat Maps, Forecast live on Business Intelligence
        </Link>
      </div>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        The pieces below are genuinely new: ABC Analysis, Inventory Turnover, and a platform-wide Supplier KPI comparison. PDF export isn't available yet — no PDF library is installed; CSV/Excel export works everywhere below.
      </p>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-saveo-emerald-700">🏭 Supplier KPIs</h2>
          <ReportExportButton
            filename="supplier-kpis"
            rows={supplierKPIs.map((s) => ({
              Supplier: s.name, GMV: s.kpis.gmv, RealizedSales: s.kpis.realizedSales, CommissionPaid: s.kpis.commissionPaid,
              NetEarnings: s.kpis.netEarnings, ActiveProducts: s.kpis.activeProducts, OutOfStock: s.kpis.outOfStockProducts,
            }))}
          />
        </div>
        <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-saveo-emerald-700/50">
                <th className="p-3">Supplier</th><th className="p-3">GMV</th><th className="p-3">Realized Sales</th><th className="p-3">Commission Paid</th><th className="p-3">Net Earnings</th><th className="p-3">Active Products</th>
              </tr>
            </thead>
            <tbody>
              {supplierKPIs.map((s) => (
                <tr key={s.supplierId} className="border-b border-black/5 last:border-0">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{formatKWD(s.kpis.gmv)}</td>
                  <td className="p-3">{formatKWD(s.kpis.realizedSales)}</td>
                  <td className="p-3">{formatKWD(s.kpis.commissionPaid)}</td>
                  <td className="p-3 font-semibold text-saveo-emerald-700">{formatKWD(s.kpis.netEarnings)}</td>
                  <td className="p-3">{s.kpis.activeProducts}</td>
                </tr>
              ))}
              {supplierKPIs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-saveo-emerald-700/40">No verified suppliers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-saveo-emerald-700">🔄 Inventory Turnover (90 days)</h2>
          <ReportExportButton
            filename="inventory-turnover"
            rows={turnover.products.map((p) => ({ Product: p.name, UnitsSold: p.unitsSold, COGS: p.cogs, InventoryValue: p.currentInventoryValue, TurnoverRatio: p.turnoverRatio ?? "—" }))}
          />
        </div>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <div className="card p-4"><p className="text-xs text-saveo-emerald-700/50">Overall Turnover Ratio</p><p className="text-xl font-black">{turnover.overallTurnover ?? "—"}</p></div>
          <div className="card p-4"><p className="text-xs text-saveo-emerald-700/50">Total COGS (90d)</p><p className="text-xl font-black">{formatKWD(turnover.totalCogs)}</p></div>
          <div className="card p-4"><p className="text-xs text-saveo-emerald-700/50">Slow Movers (0 sales)</p><p className="text-xl font-black text-red-600">{turnover.slowMovers.length}</p></div>
        </div>
        <div className="space-y-1.5 text-sm">
          {turnover.products.slice(0, 15).map((p) => (
            <div key={p.productId} className="flex justify-between rounded-lg bg-black/[0.02] px-3 py-2">
              <span>{p.name}</span>
              <span className="font-semibold">{p.turnoverRatio ?? "—"}× ({p.unitsSold} sold, {formatKWD(p.currentInventoryValue)} on hand)</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-saveo-emerald-700">📊 ABC Analysis</h2>
          <ReportExportButton
            filename="abc-analysis"
            rows={abc.products.map((p) => ({ Product: p.name, Revenue: p.revenue, CumulativePercent: p.cumulativePercent, Tier: p.tier }))}
          />
        </div>
        <div className="mb-3 grid grid-cols-3 gap-3">
          {(["A", "B", "C"] as const).map((tier) => (
            <div key={tier} className="card p-4">
              <p className="text-xs text-saveo-emerald-700/50">Tier {tier}</p>
              <p className="text-xl font-black">{abc.summary[tier].count} products</p>
              <p className="text-xs text-saveo-emerald-700/50">{formatKWD(abc.summary[tier].revenue)}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 text-sm">
          {abc.products.slice(0, 20).map((p) => (
            <div key={p.productId} className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2">
              <span>{p.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-saveo-emerald-700/50">{formatKWD(p.revenue)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_STYLES[p.tier]}`}>{p.tier}</span>
              </div>
            </div>
          ))}
          {abc.products.length === 0 && <p className="text-saveo-emerald-700/40">No sales data yet.</p>}
        </div>
      </section>
    </div>
  );
}
