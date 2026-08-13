import { ProductAccountingService } from "@/lib/services/product-accounting-service";
import { formatKWD } from "@/lib/utils";

export default async function AdminAccountingPage() {
  const report = await ProductAccountingService.getCatalogReport();

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-2 text-2xl font-bold">Product Accounting</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Profit = Selling Price − Purchase Cost − Commission − Fees. Only products with a Purchase Cost entered by
        their supplier are included ({report.productsWithCostData} of the catalog).
      </p>

      <div className="mb-6 rounded-xl2 border border-black/5 bg-white p-5">
        <p className="text-xs text-saveo-emerald-700/50">Total Profit (products with cost data)</p>
        <p className={`text-3xl font-black ${report.totalProfit >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>
          {formatKWD(report.totalProfit)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">🏆 Best Profit Products</h2>
          <div className="space-y-2">
            {report.bestProfitProducts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-saveo-emerald-700/40">Margin {p.marginPercent}%</p>
                </div>
                <span className="font-bold text-saveo-emerald-700">{formatKWD(p.netProfit ?? 0)}</span>
              </div>
            ))}
            {report.bestProfitProducts.length === 0 && (
              <p className="text-sm text-saveo-emerald-700/40">No products with cost data yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl2 border border-red-100 bg-red-50/30 p-5">
          <h2 className="mb-3 font-bold text-red-700">⚠️ Loss Products</h2>
          <div className="space-y-2">
            {report.lossProducts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-red-600/60">Margin {p.marginPercent}%</p>
                </div>
                <span className="font-bold text-red-600">{formatKWD(p.netProfit ?? 0)}</span>
              </div>
            ))}
            {report.lossProducts.length === 0 && (
              <p className="text-sm text-saveo-emerald-700/40">No products are currently selling at a loss. 🎉</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
