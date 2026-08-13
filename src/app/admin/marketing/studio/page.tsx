import { MarketingCampaignService } from "@/lib/services/marketing-campaign-service";
import { SmartRecommendationService } from "@/lib/services/smart-recommendation-service";
import { formatKWD } from "@/lib/utils";
import { CreateCampaignForm } from "@/components/admin/create-marketing-campaign-form";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import Link from "next/link";
import { Lightbulb } from "lucide-react";

export default async function MarketingStudioPage() {
  const [campaigns, recommendations] = await Promise.all([
    MarketingCampaignService.getAll(),
    SmartRecommendationService.getAll(),
  ]);
  const active = campaigns.filter((c) => c.status === "ACTIVE");
  const completed = campaigns.filter((c) => c.status === "COMPLETED");
  const drafts = campaigns.filter((c) => c.status === "DRAFT");

  const analyticsByCampaign = await Promise.all(campaigns.map((c) => MarketingCampaignService.getAnalytics(c.id)));

  function CampaignCard({ campaign, index }: { campaign: (typeof campaigns)[number]; index: number }) {
    const stats = analyticsByCampaign[index];
    return (
      <div className="rounded-xl2 border border-black/5 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold">{campaign.name}</p>
              {campaign.variantOfId && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Variant B</span>}
              {campaign.variants.length > 0 && <span className="rounded-full bg-saveo-emerald-100 px-2 py-0.5 text-[10px] font-bold text-saveo-emerald-700">Has Variant</span>}
            </div>
            <p className="text-xs text-saveo-emerald-700/50">
              {campaign.type} · {campaign.objective} · Budget {formatKWD(Number(campaign.budget))}
            </p>
          </div>
          <Link href={`/admin/marketing/studio/${campaign.id}`} className="text-xs font-semibold text-saveo-emerald-600">
            Manage →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-black/5 pt-3 sm:grid-cols-6">
          <div><p className="text-[10px] text-saveo-emerald-700/50">Views</p><p className="font-bold">{stats.views}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">CTR</p><p className="font-bold">{stats.ctr}%</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Conv.</p><p className="font-bold">{stats.conversionRate}%</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Orders</p><p className="font-bold">{stats.orders}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Revenue</p><p className="font-bold">{formatKWD(stats.revenue)}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">ROI</p><p className={`font-bold ${stats.roi >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{stats.roi}%</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Marketing Studio" }]} />
      <h1 className="mb-2 text-2xl font-bold">Marketing Campaign Studio</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Internal campaign management, ad content, and templates — no external ad platform is connected in this phase.
      </p>

      <div className="mb-6 flex gap-3">
        <Link href="/admin/marketing/studio/generator" className="btn-outline text-sm">✨ Ad Content Generator</Link>
        <Link href="/admin/marketing/studio/templates" className="btn-outline text-sm">🎨 Ad Templates</Link>
        <Link href="/admin/marketing/library" className="btn-outline text-sm">📚 Content Library</Link>
      </div>

      {recommendations.length > 0 && (
        <div className="mb-8 rounded-xl2 border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-700">
            <Lightbulb className="h-4 w-4" /> Smart Recommendations
          </h2>
          <ul className="space-y-1.5 text-sm text-amber-800">
            {recommendations.map((r, i) => (
              <li key={i}>💡 {r.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8">
        <CreateCampaignForm />
      </div>

      <div className="mb-2 text-sm font-bold text-saveo-emerald-700">Active Campaigns ({active.length})</div>
      <div className="mb-6 space-y-3">
        {active.map((c) => <CampaignCard key={c.id} campaign={c} index={campaigns.indexOf(c)} />)}
        {active.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No active campaigns.</p>}
      </div>

      <div className="mb-2 text-sm font-bold text-saveo-emerald-700">Draft Campaigns ({drafts.length})</div>
      <div className="mb-6 space-y-3">
        {drafts.map((c) => <CampaignCard key={c.id} campaign={c} index={campaigns.indexOf(c)} />)}
        {drafts.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No drafts.</p>}
      </div>

      <div className="mb-2 text-sm font-bold text-saveo-emerald-700">Completed Campaigns ({completed.length})</div>
      <div className="space-y-3">
        {completed.map((c) => <CampaignCard key={c.id} campaign={c} index={campaigns.indexOf(c)} />)}
        {completed.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No completed campaigns yet.</p>}
      </div>
    </div>
  );
}
