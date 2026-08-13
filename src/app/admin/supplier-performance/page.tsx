import { SupplierPerformanceService } from "@/lib/services/supplier-performance-service";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { RunPerformanceEvaluationButton } from "@/components/admin/run-performance-evaluation-button";

const BADGE_STYLES: Record<string, string> = {
  ELITE: "bg-purple-100 text-purple-800",
  TOP_RATED: "bg-saveo-emerald-100 text-saveo-emerald-800",
  TRUSTED: "bg-blue-100 text-blue-800",
  RISING: "bg-amber-100 text-amber-800",
  NONE: "bg-black/5 text-saveo-emerald-700/50",
};

const BADGE_LABELS: Record<string, string> = {
  ELITE: "🏆 Elite",
  TOP_RATED: "⭐ Top Rated",
  TRUSTED: "🛡️ Trusted",
  RISING: "📈 Rising",
  NONE: "—",
};

export default async function SupplierPerformancePage() {
  const leaderboard = await SupplierPerformanceService.getLeaderboard(50);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Supplier Performance" }]} />
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Supplier Performance Center</h1>
        <RunPerformanceEvaluationButton />
      </div>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Every KPI is computed from real order, delivery, review, complaint, and stock-count data. Composite score automatically adjusts a supplier's product visibility (via the existing discovery ranking) — real rewards for scores 70+, real penalties below 40 or for high cancellation rates.
      </p>

      <div className="space-y-2">
        {leaderboard.map((s, i) => (
          <div key={s.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{i + 1}. {s.supplier.companyName}</p>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${BADGE_STYLES[s.badge]}`}>{BADGE_LABELS[s.badge]}</span>
                <span className="text-lg font-black text-saveo-emerald-700">{s.compositeScore}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-saveo-emerald-700/70 sm:grid-cols-7">
              <div><p className="opacity-50">Acceptance</p><p className="font-semibold">{s.acceptanceRate}%</p></div>
              <div><p className="opacity-50">Cancellation</p><p className="font-semibold">{s.cancellationRate}%</p></div>
              <div><p className="opacity-50">Late Shipment</p><p className="font-semibold">{s.lateShipmentRate}%</p></div>
              <div><p className="opacity-50">Rating</p><p className="font-semibold">{s.avgRating}/5</p></div>
              <div><p className="opacity-50">Return Rate</p><p className="font-semibold">{s.returnRate}%</p></div>
              <div><p className="opacity-50">Complaint Rate</p><p className="font-semibold">{s.complaintRate}%</p></div>
              <div><p className="opacity-50">Inventory Accuracy</p><p className="font-semibold">{s.inventoryAccuracy}%</p></div>
            </div>
            {(s.lastRewardReason || s.lastPenaltyReason) && (
              <p className={`mt-2 text-xs ${s.lastPenaltyReason ? "text-red-600" : "text-saveo-emerald-600"}`}>
                {s.lastPenaltyReason ?? s.lastRewardReason} (visibility boost: {s.supplier.visibilityBoost >= 0 ? "+" : ""}{s.supplier.visibilityBoost})
              </p>
            )}
          </div>
        ))}
        {leaderboard.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No evaluations yet — click "Run Evaluation Now" to score every verified supplier.
          </div>
        )}
      </div>
    </div>
  );
}
