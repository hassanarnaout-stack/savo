import { AICommerceRecommendationService } from "@/lib/services/ai-commerce-recommendation-service";
import { BusinessAlertService } from "@/lib/services/business-alert-service";
import { AIAssistantChat } from "@/components/admin/ai-assistant-chat";
import { Breadcrumb } from "@/components/admin/breadcrumb";

const CATEGORY_LABELS: Record<string, string> = {
  FLASH_DEAL: "⚡ Flash Deal",
  MARKETING_CAMPAIGN: "📣 Marketing Campaign",
  DISCOUNT: "💰 Discount",
  RESTOCK: "📦 Restock",
  SUPPLIER_IMPROVEMENT: "🤝 Supplier Improvement",
};

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "border-red-200 bg-red-50 text-red-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  LOW: "border-black/5 bg-black/[0.02] text-saveo-emerald-700/70",
};

export default async function AIAssistantPage() {
  const [recommendations, alerts] = await Promise.all([
    AICommerceRecommendationService.getAll(),
    BusinessAlertService.getAlerts(),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "AI Assistant" }]} />
      <h1 className="mb-1 text-2xl font-bold">AI Commerce Assistant</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        No language model is connected — every answer, recommendation, and alert below is computed directly from Savo's real database.
      </p>

      <div className="mb-6">
        <AIAssistantChat />
      </div>

      {alerts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">🚨 Business Alerts</h2>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`rounded-xl2 border p-4 text-sm ${SEVERITY_STYLES[a.severity]}`}>
                <p className="font-bold">{a.title}</p>
                <p className="text-xs opacity-80">{a.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-bold text-saveo-emerald-700">💡 Auto Recommendations</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendations.map((r, i) => (
            <div key={i} className="rounded-xl2 border border-black/5 bg-white p-4 text-sm">
              <p className="mb-1 text-xs font-bold text-saveo-emerald-700/60">{CATEGORY_LABELS[r.category]}</p>
              <p className="font-semibold">{r.title}</p>
              <p className="text-xs text-saveo-emerald-700/60">{r.reason}</p>
            </div>
          ))}
          {recommendations.length === 0 && (
            <div className="col-span-full rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
              No recommendations right now — nothing in the data crosses a threshold worth flagging. 🎉
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
