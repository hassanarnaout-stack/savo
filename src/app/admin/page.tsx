import { prisma } from "@/lib/prisma";
import { formatKWD, isLowStock } from "@/lib/utils";
import { TrendingUp, ShoppingBag, DollarSign, AlertTriangle } from "lucide-react";
import { RevenueChart } from "@/components/admin/revenue-chart";

async function getDashboardData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [orders, revenueAgg, bestSellers, lowStockProducts, recentOrders] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.product.findMany({
      orderBy: { orderCount: "desc" },
      take: 5,
      select: { id: true, name: true, orderCount: true, saveoPrice: true, stockQty: true },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, stockQty: true, lowStockAlert: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const dailyOrders = await prisma.$queryRaw<{ day: string; total: number; count: bigint }[]>`
    SELECT to_char("createdAt", 'YYYY-MM-DD') as day, SUM(total)::float as total, COUNT(*) as count
    FROM orders
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY day
    ORDER BY day ASC
  `;

  const lowStock = lowStockProducts.filter((p) => isLowStock(p.stockQty, p.lowStockAlert));

  return {
    orderCount: orders,
    revenue: Number(revenueAgg._sum.total ?? 0),
    bestSellers,
    lowStock,
    recentOrders,
    dailyOrders: dailyOrders.map((d) => ({ day: d.day, total: d.total, count: Number(d.count) })),
  };
}

export default async function AdminDashboardPage() {
  const { orderCount, revenue, bestSellers, lowStock, recentOrders, dailyOrders } = await getDashboardData();

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-saveo-emerald-700/50">Last 30 days overview</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Revenue" value={formatKWD(revenue)} accent />
        <StatCard icon={ShoppingBag} label="Orders" value={orderCount.toString()} />
        <StatCard icon={TrendingUp} label="Avg. Order Value" value={formatKWD(orderCount ? revenue / orderCount : 0)} />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={lowStock.length.toString()} warn={lowStock.length > 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-bold">Revenue Trend</h2>
          <RevenueChart data={dailyOrders} />
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-bold">Best Selling Products</h2>
          <ul className="space-y-3">
            {bestSellers.map((p, idx) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saveo-emerald-700/5 text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-saveo-emerald-700/50">{p.orderCount} sold</p>
                </div>
                <span className="text-sm font-bold">{formatKWD(Number(p.saveoPrice))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-bold">Inventory Alerts</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-saveo-emerald-700/50">All products are well-stocked.</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                    {p.stockQty} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-bold">Recent Orders</h2>
          <ul className="space-y-2 text-sm">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-saveo-emerald-700/50">{o.user.name ?? o.user.email}</p>
                </div>
                <span className="font-bold">{formatKWD(Number(o.total))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  warn,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`card p-5 ${accent ? "bg-saveo-emerald-700 text-white" : ""}`}>
      <Icon className={`h-5 w-5 ${warn ? "text-red-500" : accent ? "text-saveo-emerald-400" : "text-saveo-emerald-700"}`} />
      <p className={`mt-3 text-2xl font-extrabold ${accent ? "text-white" : ""}`}>{value}</p>
      <p className={`text-xs ${accent ? "text-white/60" : "text-saveo-emerald-700/50"}`}>{label}</p>
    </div>
  );
}
