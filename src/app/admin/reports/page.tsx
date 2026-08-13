import { prisma } from "@/lib/prisma";
import { ProductAccountingService } from "@/lib/services/product-accounting-service";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { ReportExportButton } from "@/components/admin/report-export-button";

export default async function AdminReportsPage() {
  const now = new Date();
  const dayAgo = new Date(now); dayAgo.setDate(dayAgo.getDate() - 1);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const in30Days = new Date(now); in30Days.setDate(in30Days.getDate() + 30);

  const [dailySales, weeklySales, monthlySales, accountingReport, damagedProducts, expiringProducts, bestSellers, supplierPerformance] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: dayAgo }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { createdAt: { gte: weekAgo }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { createdAt: { gte: monthAgo }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true }),
    ProductAccountingService.getCatalogReport(),
    prisma.product.findMany({ where: { damagedQuantity: { gt: 0 } }, select: { name: true, damagedQuantity: true, purchaseCost: true } }),
    prisma.product.findMany({ where: { expiryDate: { gte: now, lt: in30Days } }, select: { name: true, stockQty: true, expiryDate: true } }),
    prisma.product.findMany({ orderBy: { orderCount: "desc" }, take: 15, select: { name: true, orderCount: true, saveoPrice: true } }),
    prisma.supplier.findMany({
      select: { companyName: true, transactions: { where: { status: { in: ["COMPLETED", "SETTLED"] } }, select: { saleAmount: true, commissionAmount: true } } },
      take: 20,
    }),
  ]);

  const supplierPerf = supplierPerformance
    .map((s) => ({
      name: s.companyName,
      sales: s.transactions.reduce((sum, t) => sum + Number(t.saleAmount), 0),
      commission: s.transactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0),
      orders: s.transactions.length,
    }))
    .filter((s) => s.orders > 0)
    .sort((a, b) => b.sales - a.sales);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Commerce ERP" }, { label: "Reports" }]} />
      <h1 className="mb-6 text-2xl font-bold">Commerce Reports</h1>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-xs text-saveo-emerald-700/50">Sales (24h)</p><p className="text-xl font-black">{formatKWD(Number(dailySales._sum.total ?? 0))}</p><p className="text-xs text-saveo-emerald-700/40">{dailySales._count} orders</p></div>
        <div className="card p-5"><p className="text-xs text-saveo-emerald-700/50">Sales (7 days)</p><p className="text-xl font-black">{formatKWD(Number(weeklySales._sum.total ?? 0))}</p><p className="text-xs text-saveo-emerald-700/40">{weeklySales._count} orders</p></div>
        <div className="card p-5"><p className="text-xs text-saveo-emerald-700/50">Sales (30 days)</p><p className="text-xl font-black">{formatKWD(Number(monthlySales._sum.total ?? 0))}</p><p className="text-xs text-saveo-emerald-700/40">{monthlySales._count} orders</p></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">1-2. Sales &amp; Profit Report</h2>
            <ReportExportButton filename="profit-report" rows={accountingReport.bestProfitProducts.map((p) => ({ Product: p.name, Price: p.sellingPrice, Cost: p.purchaseCost, Profit: p.netProfit, Margin: p.marginPercent }))} />
          </div>
          <p className="text-sm">Total Profit: <strong className={accountingReport.totalProfit >= 0 ? "text-saveo-emerald-700" : "text-red-600"}>{formatKWD(accountingReport.totalProfit)}</strong></p>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">7. Best Selling Products</h2>
            <ReportExportButton filename="best-sellers" rows={bestSellers.map((p) => ({ Product: p.name, Orders: p.orderCount, Price: Number(p.saveoPrice) }))} />
          </div>
          <div className="space-y-1 text-sm">
            {bestSellers.slice(0, 5).map((p, i) => <p key={i}>{i + 1}. {p.name} — {p.orderCount} orders</p>)}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">8. Supplier Performance</h2>
            <ReportExportButton filename="supplier-performance" rows={supplierPerf.map((s) => ({ Supplier: s.name, Sales: s.sales, Commission: s.commission, Orders: s.orders }))} />
          </div>
          <div className="space-y-1 text-sm">
            {supplierPerf.slice(0, 5).map((s, i) => <p key={i}>{i + 1}. {s.name} — {formatKWD(s.sales)}</p>)}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">5. Damaged Report</h2>
            <ReportExportButton filename="damaged-report" rows={damagedProducts.map((p) => ({ Product: p.name, Quantity: p.damagedQuantity, LossValue: p.damagedQuantity * Number(p.purchaseCost ?? 0) }))} />
          </div>
          <p className="text-sm">{damagedProducts.length} products with damage recorded</p>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-saveo-emerald-700">6. Expiry Report</h2>
            <ReportExportButton filename="expiry-report" rows={expiringProducts.map((p) => ({ Product: p.name, Stock: p.stockQty, ExpiryDate: p.expiryDate?.toISOString().slice(0, 10) }))} />
          </div>
          <p className="text-sm">{expiringProducts.length} products expiring within 30 days</p>
        </section>
      </div>
    </div>
  );
}
