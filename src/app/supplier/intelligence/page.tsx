import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { SupplierIntelligenceService } from "@/lib/services/supplier-intelligence-service";
import { formatKWD } from "@/lib/utils";

export default async function SupplierIntelligencePage() {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) redirect("/supplier");
  const { supplier } = gate;

  const [bestSellers, conversionRates, priceSuggestions, promotions] = await Promise.all([
    SupplierIntelligenceService.getBestSellingProducts(supplier.id),
    SupplierIntelligenceService.getConversionRates(supplier.id),
    SupplierIntelligenceService.getPriceSuggestions(supplier.id),
    SupplierIntelligenceService.getPromotionRecommendations(supplier.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-saveo-emerald-700">Growth Intelligence</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Real numbers from your own store — not competitor data (Savo doesn't have access to other marketplaces' pricing).
      </p>

      <section className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">🏆 Best Selling Products</h2>
        <div className="space-y-1.5 text-sm">
          {bestSellers.map((p, i) => (
            <div key={p.productId} className="flex justify-between">
              <span>{i + 1}. {p.name}</span>
              <span className="font-semibold">{p.orderCount} orders · {formatKWD(p.revenue)}</span>
            </div>
          ))}
          {bestSellers.length === 0 && <p className="text-saveo-emerald-700/40">No sales data yet.</p>}
        </div>
      </section>

      <section className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">📊 Conversion Rate</h2>
        <div className="space-y-1.5 text-sm">
          {conversionRates.slice(0, 8).map((p) => (
            <div key={p.productId} className="flex justify-between">
              <span>{p.name}</span>
              <span className="font-semibold">{p.views} views → {p.conversionRate}%</span>
            </div>
          ))}
          {conversionRates.length === 0 && <p className="text-saveo-emerald-700/40">Not enough traffic yet.</p>}
        </div>
      </section>

      <section className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">💰 Pricing vs Category Average</h2>
        <div className="space-y-1.5 text-sm">
          {priceSuggestions.map((p) => (
            <div key={p.productId}>
              <div className="flex justify-between">
                <span>{p.productName}</span>
                <span className="font-semibold">{formatKWD(p.yourPrice)} vs {formatKWD(p.categoryAveragePrice)} avg</span>
              </div>
              <p className="text-xs text-saveo-emerald-700/50">{p.suggestion}</p>
            </div>
          ))}
          {priceSuggestions.length === 0 && <p className="text-saveo-emerald-700/40">No category comparisons available yet.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">💡 Recommended Promotions</h2>
        <div className="space-y-1.5 text-sm">
          {promotions.map((p) => (
            <p key={p.productId}>{p.productName} — {p.reason}</p>
          ))}
          {promotions.length === 0 && <p className="text-saveo-emerald-700/40">No underperforming products flagged right now. 🎉</p>}
        </div>
      </section>
    </div>
  );
}
