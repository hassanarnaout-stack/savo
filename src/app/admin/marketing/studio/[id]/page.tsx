import { notFound } from "next/navigation";
import { MarketingCampaignService } from "@/lib/services/marketing-campaign-service";
import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { SocialExportPanel } from "@/components/admin/social-export-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;

  const campaign = await MarketingCampaignService.getById(id);
  if (!campaign) notFound();

  const [stats, comparison, latestAdContent, latestGeneratedAd] = await Promise.all([
    MarketingCampaignService.getAnalytics(id),
    MarketingCampaignService.compareVariants(id),
    prisma.adContent.findFirst({ where: { campaignId: id }, orderBy: { createdAt: "desc" } }),
    prisma.generatedAd.findFirst({ where: { campaignId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Marketing Studio", href: "/admin/marketing/studio" }, { label: campaign.name }]} />
      <h1 className="mb-1 text-2xl font-bold">{campaign.name}</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        {campaign.type} · {campaign.objective} · {campaign.status} · Budget {formatKWD(Number(campaign.budget))}
      </p>

      <section className="mb-6 rounded-xl2 border border-black/5 bg-white p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Analytics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          <div><p className="text-[10px] text-saveo-emerald-700/50">Views</p><p className="font-bold">{stats.views}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Clicks</p><p className="font-bold">{stats.clicks}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">CTR</p><p className="font-bold">{stats.ctr}%</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Add to Cart</p><p className="font-bold">{stats.addToCart}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Orders</p><p className="font-bold">{stats.orders}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Conversion</p><p className="font-bold">{stats.conversionRate}%</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">Revenue</p><p className="font-bold">{formatKWD(stats.revenue)}</p></div>
          <div><p className="text-[10px] text-saveo-emerald-700/50">ROI</p><p className={`font-bold ${stats.roi >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{stats.roi}%</p></div>
        </div>
      </section>

      {comparison && (
        <section className="mb-6 rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">A/B Comparison</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["variantA", "variantB"] as const).map((key) => {
              const variant = comparison[key];
              const isWinner = comparison.winner === (key === "variantA" ? "A" : "B");
              return (
                <div key={key} className={`rounded-xl2 border p-4 ${isWinner ? "border-saveo-emerald-400 bg-saveo-emerald-50" : "border-black/5"}`}>
                  <p className="font-semibold">
                    {key === "variantA" ? "Variant A" : "Variant B"} {isWinner && "🏆"}
                  </p>
                  <p className="text-xs text-saveo-emerald-700/50">{variant.name}</p>
                  <p className="mt-2 text-sm">Views: {variant.stats.views} · Clicks: {variant.stats.clicks} · Sales: {variant.stats.orders}</p>
                  <p className="text-sm font-bold">Conversion: {variant.stats.conversionRate}%</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-saveo-emerald-700/40">
            This is a recommendation only — neither variant is stopped automatically.
          </p>
        </section>
      )}

      <SocialExportPanel
        campaignName={campaign.name}
        adContent={latestAdContent}
        generatedAdSvg={latestGeneratedAd?.svgContent ?? null}
      />
    </div>
  );
}
