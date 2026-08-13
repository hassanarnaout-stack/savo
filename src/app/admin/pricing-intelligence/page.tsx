import { PricingEngineService } from "@/lib/services/pricing-engine-service";
import { formatKWD } from "@/lib/utils";
import { ApprovePriceButton } from "@/components/admin/approve-price-button";
import { CompetitorPriceManager } from "@/components/admin/competitor-price-manager";
import { Breadcrumb } from "@/components/admin/breadcrumb";

const ACTION_STYLES: Record<string, string> = {
  INCREASE: "border-saveo-emerald-200 bg-saveo-emerald-50 text-saveo-emerald-800",
  DECREASE: "border-red-200 bg-red-50 text-red-800",
  KEEP: "border-black/5 bg-black/[0.02] text-saveo-emerald-700/70",
};

const ACTION_LABELS: Record<string, string> = {
  INCREASE: "⬆ Increase Price",
  DECREASE: "⬇ Decrease Price",
  KEEP: "= Keep Price",
};

export default async function PricingIntelligencePage() {
  const [analyses, marginWarnings] = await Promise.all([
    PricingEngineService.getAllWithSuggestions(50),
    PricingEngineService.getMarginWarnings(),
  ]);

  const actionable = analyses.filter((a) => a.action !== "KEEP");
  const totalProfitImpact = actionable.reduce((sum, a) => sum + a.profitDifference, 0);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Pricing Intelligence" }]} />
      <h1 className="mb-1 text-2xl font-bold">Pricing Intelligence</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        "Competitor Difference" compares against Savo's own category average (no external competitor data source exists). "Elasticity Score" is a conversion-rate-based estimate, not a trained model.
        Nothing here changes a price automatically — every suggestion requires your explicit approval.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs text-saveo-emerald-700/50">Products Analyzed</p>
          <p className="text-2xl font-black">{analyses.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-saveo-emerald-700/50">Actionable Suggestions</p>
          <p className="text-2xl font-black">{actionable.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-saveo-emerald-700/50">Total Profit Impact (if all approved)</p>
          <p className={`text-2xl font-black ${totalProfitImpact >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{formatKWD(totalProfitImpact)}</p>
        </div>
      </div>

      {marginWarnings.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-bold text-red-700">🚨 Margin Warnings (below 10%)</h2>
          <div className="space-y-2">
            {marginWarnings.map((w) => (
              <div key={w.productId} className="rounded-xl2 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold">{w.name}</p>
                <p className="text-xs">Current margin: {w.currentMargin?.toFixed(1)}% at {formatKWD(w.currentPrice)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-bold text-saveo-emerald-700">💡 Price Suggestions</h2>
        <div className="space-y-3">
          {analyses.map((a) => (
            <div key={a.productId} className={`rounded-xl2 border p-4 ${ACTION_STYLES[a.action]}`}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs opacity-70">{ACTION_LABELS[a.action]}</p>
                </div>
                {a.action !== "KEEP" && <ApprovePriceButton productId={a.productId} suggestedPrice={a.suggestedPrice} />}
              </div>
              <p className="mb-2 text-xs opacity-80">{a.explanation}</p>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-6">
                <div><p className="opacity-50">Current</p><p className="font-semibold">{formatKWD(a.currentPrice)}</p></div>
                <div><p className="opacity-50">Suggested</p><p className="font-semibold">{formatKWD(a.suggestedPrice)}</p></div>
                <div><p className="opacity-50">Min / Max</p><p className="font-semibold">{formatKWD(a.minimumPrice)} / {formatKWD(a.maximumPrice)}</p></div>
                <div><p className="opacity-50">Margin</p><p className="font-semibold">{a.currentMargin?.toFixed(1) ?? "—"}%</p></div>
                <div><p className="opacity-50">vs {a.competitorPriceSource === "REAL" ? "Competitors" : "Category Avg"}</p><p className="font-semibold">{a.competitorDifferencePercent !== null ? `${a.competitorDifferencePercent}%` : "—"}</p></div>
                <div><p className="opacity-50">Elasticity Est.</p><p className="font-semibold">{a.elasticityScore}/100</p></div>
              </div>
              <CompetitorPriceManager productId={a.productId} existing={a.competitorPrices} source={a.competitorPriceSource} />
            </div>
          ))}
          {analyses.length === 0 && (
            <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
              No products have both a cost price on file and enough traffic (10+ views) to analyze yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
