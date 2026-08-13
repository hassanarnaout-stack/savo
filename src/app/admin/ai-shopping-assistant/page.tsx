import { requireAdmin } from "@/lib/auth";
import { getAIAnalyticsSummary } from "@/lib/ai-assistant";

export const dynamic = "force-dynamic";

export default async function AIShoppingAssistantAnalyticsPage() {
  await requireAdmin();

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const summary = await getAIAnalyticsSummary(since);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">Saveo AI Shopping Assistant — Analytics</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">Last 30 days. Every number below is a real count from AnalyticsEvent — no estimates.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-saveo-emerald-700/50">Sessions</p><p className="text-2xl font-bold">{summary.sessions}</p></div>
        <div className="card p-4"><p className="text-xs text-saveo-emerald-700/50">Queries</p><p className="text-2xl font-bold">{summary.totalQueries}</p></div>
        <div className="card p-4"><p className="text-xs text-saveo-emerald-700/50">Recommendations</p><p className="text-2xl font-bold">{summary.recommendations}</p></div>
        <div className="card p-4"><p className="text-xs text-saveo-emerald-700/50">Add-to-Cart</p><p className="text-2xl font-bold">{summary.addToCarts}</p></div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-saveo-emerald-700/50">Recommendation CTR</p>
          <p className="text-xl font-bold">{summary.recommendationClickThroughRate !== null ? `${(summary.recommendationClickThroughRate * 100).toFixed(1)}%` : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-saveo-emerald-700/50">Add-to-Cart Rate</p>
          <p className="text-xl font-bold">{summary.addToCartRate !== null ? `${(summary.addToCartRate * 100).toFixed(1)}%` : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-saveo-emerald-700/50">Conversion Rate</p>
          <p className="text-xl font-bold">{summary.conversionRate !== null ? `${(summary.conversionRate * 100).toFixed(1)}%` : "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-bold">Top Queries</h2>
          <div className="space-y-1">
            {summary.topQueries.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No queries yet.</p>}
            {summary.topQueries.map((q) => (
              <div key={q.query} className="flex justify-between rounded-lg bg-black/[0.02] px-3 py-2 text-sm">
                <span>{q.query}</span><span className="font-semibold">{q.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-bold">Top Recommended Products</h2>
          <div className="space-y-1">
            {summary.topRecommendedProducts.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No recommendations yet.</p>}
            {summary.topRecommendedProducts.map((p) => (
              <div key={p.productId} className="flex justify-between rounded-lg bg-black/[0.02] px-3 py-2 text-sm">
                <span className="truncate">{p.productId}</span><span className="font-semibold">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
