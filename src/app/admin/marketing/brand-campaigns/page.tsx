import { prisma } from "@/lib/prisma";
import { BrandCampaignService } from "@/lib/services/brand-campaign-service";
import { formatKWD } from "@/lib/utils";
import { CreateBrandCampaignForm, BrandCampaignToggle } from "@/components/admin/brand-campaign-controls";

export default async function AdminBrandCampaignsPage() {
  const [campaigns, products, categories] = await Promise.all([
    BrandCampaignService.getAll(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const analyticsByCampaign = await Promise.all(campaigns.map((c) => BrandCampaignService.getAnalytics(c.id)));

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Brand Campaigns</h1>

      <div className="mb-6">
        <CreateBrandCampaignForm products={products} categories={categories} />
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign, i) => {
          const analytics = analyticsByCampaign[i];
          return (
            <div key={campaign.id} className="shadow-luxury rounded-xl2 border border-black/5 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{campaign.brandName}</p>
                  <p className="text-xs text-saveo-emerald-700/50">
                    {campaign.type.replace(/_/g, " ")} · {campaign.product?.name ?? campaign.category?.name ?? "—"} ·{" "}
                    Budget {formatKWD(Number(campaign.budget))} ·{" "}
                    {new Date(campaign.startDate).toLocaleDateString("en-GB")} - {new Date(campaign.endDate).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <BrandCampaignToggle campaignId={campaign.id} isActive={campaign.isActive} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-4 sm:grid-cols-6">
                <div><p className="text-[10px] text-saveo-emerald-700/50">Views</p><p className="font-bold">{analytics.views}</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Clicks</p><p className="font-bold">{analytics.clicks}</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">CTR</p><p className="font-bold text-saveo-gold-600">{analytics.clickThroughRate}%</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Add to Cart</p><p className="font-bold">{analytics.addToCarts}</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Sales</p><p className="font-bold">{formatKWD(analytics.salesRevenue)}</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Conversion</p><p className="font-bold">{analytics.conversionRate}%</p></div>
              </div>
            </div>
          );
        })}
        {campaigns.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No brand campaigns yet.
          </div>
        )}
      </div>
    </div>
  );
}
