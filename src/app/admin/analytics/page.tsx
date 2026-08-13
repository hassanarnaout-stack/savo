import { AnalyticsDashboardService } from "@/lib/services/analytics-dashboard-service";
import { formatKWD } from "@/lib/utils";

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-saveo-emerald-700">{label}</span>
        <span className="text-saveo-emerald-700/50">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/5">
        <div className="h-full rounded-full bg-saveo-emerald-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const [funnel, topProducts, topCategories, retention, supplierPerformance] = await Promise.all([
    AnalyticsDashboardService.getFunnel(),
    AnalyticsDashboardService.getTopProducts(),
    AnalyticsDashboardService.getTopCategories(),
    AnalyticsDashboardService.getCustomerRetention(),
    AnalyticsDashboardService.getSupplierPerformance(),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Advanced Analytics</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl2 border border-black/5 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Customer Funnel</h2>
            <span className="rounded-full bg-saveo-gold-100 px-3 py-1 text-sm font-black text-saveo-emerald-700">
              {funnel.conversionRate.toFixed(2)}% conversion
            </span>
          </div>
          <div className="space-y-3">
            <FunnelBar label="Visitors" value={funnel.visitors} max={funnel.visitors} />
            <FunnelBar label="Product Views" value={funnel.productViews} max={funnel.visitors} />
            <FunnelBar label="Add To Cart" value={funnel.addToCart} max={funnel.visitors} />
            <FunnelBar label="Checkout Started" value={funnel.checkoutStarted} max={funnel.visitors} />
            <FunnelBar label="Completed Orders" value={funnel.completedOrders} max={funnel.visitors} />
          </div>
        </section>

        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold">Top Products</h2>
          <div className="space-y-1.5">
            {topProducts.map((p, i) => (
              <div key={p.productId} className="flex justify-between text-sm">
                <span>{i + 1}. {p.name}</span>
                <span className="font-semibold text-saveo-emerald-700/60">{p.views} views</span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No product view data yet.</p>}
          </div>
        </section>

        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold">Top Categories</h2>
          <div className="space-y-1.5">
            {topCategories.map((c, i) => (
              <div key={c.category} className="flex justify-between text-sm">
                <span>{i + 1}. {c.category}</span>
                <span className="font-semibold text-saveo-emerald-700/60">{c.views} views</span>
              </div>
            ))}
            {topCategories.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No category view data yet.</p>}
          </div>
        </section>

        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold">Customer Retention</h2>
          <p className="text-3xl font-black text-saveo-emerald-700">{retention.retentionRate.toFixed(1)}%</p>
          <p className="text-xs text-saveo-emerald-700/50">
            {retention.repeatCustomers} of {retention.totalCustomers} customers have placed more than one order
          </p>
        </section>

        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold">Supplier Performance</h2>
          <div className="space-y-1.5">
            {supplierPerformance.map((s, i) => (
              <div key={s.supplierId} className="flex justify-between text-sm">
                <span>{i + 1}. {s.companyName}</span>
                <span className="font-semibold text-saveo-emerald-700/60">{formatKWD(s.realizedSales)} · {s.orderCount} orders</span>
              </div>
            ))}
            {supplierPerformance.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No realized sales yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
