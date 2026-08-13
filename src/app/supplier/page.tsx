import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { formatKWD } from "@/lib/utils";
import {
  getSupplierKPIs, getDailySales, getMonthlyRevenue,
  getOrdersByStatus, getTopProducts, getRevenueByCategory,
} from "@/lib/supplier-analytics";
import {
  DailySalesChart, MonthlyRevenueChart, OrdersByStatusChart,
  TopProductsChart, RevenueByCategoryChart,
} from "@/components/supplier/charts";
import { AlertTriangle, PackageX } from "lucide-react";
import Link from "next/link";
import { InfoTooltip } from "@/components/ui/tooltip";

export default async function SupplierDashboard() {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier");
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

  const [kpis, dailySales, monthlyRevenue, ordersByStatus, topProducts, revenueByCategory] = await Promise.all([
    getSupplierKPIs(supplier.id),
    getDailySales(supplier.id, 30),
    getMonthlyRevenue(supplier.id, 12),
    getOrdersByStatus(supplier.id),
    getTopProducts(supplier.id, 5),
    getRevenueByCategory(supplier.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-saveo-emerald-700">Welcome, {supplier.companyName}</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">Your sales &amp; commission overview</p>

      {(kpis.lowStockProducts > 0 || kpis.outOfStockProducts > 0) && (
        <Link
          href="/supplier/inventory"
          className="mb-6 flex flex-wrap items-center gap-4 rounded-xl2 border border-amber-200 bg-amber-50 px-5 py-3 text-sm"
        >
          {kpis.outOfStockProducts > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-red-700">
              <PackageX className="h-4 w-4" /> {kpis.outOfStockProducts} out of stock
            </span>
          )}
          {kpis.lowStockProducts > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-amber-700">
              <AlertTriangle className="h-4 w-4" /> {kpis.lowStockProducts} low stock
            </span>
          )}
        </Link>
      )}

      {/* Sales KPIs */}
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase text-saveo-emerald-700/50">
        Activity (GMV)
        <InfoTooltip text="These figures count orders at the moment they're placed, before delivery — they measure how busy your store is, not money owed to you. See 'Completed Sales' below for realized revenue." />
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Today's Sales" value={formatKWD(kpis.todaySales)} />
        <Kpi label="Yesterday's Sales" value={formatKWD(kpis.yesterdaySales)} />
        <Kpi label="Monthly Sales" value={formatKWD(kpis.monthlySales)} />
        <Kpi label="Orders Today" value={String(kpis.ordersToday)} />
        <Kpi label="Orders This Month" value={String(kpis.ordersThisMonth)} />
      </div>

      {/* Financial KPIs */}
      <h2 className="mb-3 text-sm font-bold uppercase text-saveo-emerald-700/50">Earnings</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="GMV"
          value={formatKWD(kpis.gmv)}
          tooltip="Gross Merchandise Value — the total value of all orders placed (excluding cancelled), counted at order time. Measures platform activity, not money owed to you yet."
        />
        <Kpi
          label="Completed Sales"
          value={formatKWD(kpis.realizedSales)}
          accent="emerald"
          tooltip="Realized Revenue — only orders that have actually been DELIVERED. This is the real sales figure your earnings and commission are calculated from."
        />
        <Kpi label="Avg. Order Value" value={formatKWD(kpis.averageOrderValue)} />
        <Kpi label="Commission Paid" value={formatKWD(kpis.commissionPaid)} tooltip="Commission on delivered orders that have been included in a completed payout (Settlement)." />
        <Kpi label="Commission Pending" value={formatKWD(kpis.commissionPending)} accent="amber" tooltip="Commission owed on delivered orders not yet paid out to Savo." />
        <Kpi label="Net Earnings" value={formatKWD(kpis.netEarnings)} accent="emerald" tooltip="Completed Sales minus Savo's commission — based on delivered orders only." />
      </div>

      {/* Catalog KPIs */}
      <h2 className="mb-3 text-sm font-bold uppercase text-saveo-emerald-700/50">Catalog</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total Products" value={String(kpis.totalProducts)} />
        <Kpi label="Active Products" value={String(kpis.activeProducts)} />
        <Kpi label="Low Stock" value={String(kpis.lowStockProducts)} accent={kpis.lowStockProducts > 0 ? "amber" : undefined} />
        <Kpi label="Out of Stock" value={String(kpis.outOfStockProducts)} accent={kpis.outOfStockProducts > 0 ? "red" : undefined} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Daily Sales (Last 30 Days)"><DailySalesChart data={dailySales} /></ChartCard>
        <ChartCard title="Monthly Revenue"><MonthlyRevenueChart data={monthlyRevenue} /></ChartCard>
        <ChartCard title="Orders by Status"><OrdersByStatusChart data={ordersByStatus} /></ChartCard>
        <ChartCard title="Top Selling Products"><TopProductsChart data={topProducts} /></ChartCard>
        <ChartCard title="Revenue by Category"><RevenueByCategoryChart data={revenueByCategory} /></ChartCard>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/supplier/reports" className="btn-outline text-sm">View Financial Reports</Link>
        <Link href="/supplier/settlements" className="btn-outline text-sm">Settlement History</Link>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  tooltip,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber" | "red";
  tooltip?: string;
}) {
  const accentClass =
    accent === "emerald" ? "text-saveo-emerald-700" : accent === "amber" ? "text-amber-600" : accent === "red" ? "text-red-600" : "text-saveo-emerald-700";
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1 text-xs text-saveo-emerald-700/50">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </p>
      <p className={`mt-1 text-lg font-extrabold ${accentClass}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-bold text-saveo-emerald-700">{title}</h3>
      {children}
    </div>
  );
}
