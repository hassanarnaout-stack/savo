import { CampaignService } from "@/lib/services/campaign-service";
import { formatKWD } from "@/lib/utils";
import { CampaignActivationToggle, PriorityInput, ScheduleControl } from "@/components/admin/campaign-controls";
import { CreateHuntForm } from "@/components/admin/create-hunt-form";
import { CollapsibleRewardEditor } from "@/components/admin/collapsible-reward-editor";
import { CAMPAIGN_TYPE_INFO } from "@/lib/campaign-type-info";
import { CampaignCustomerCopyEditor } from "@/components/admin/campaign-customer-copy-editor";
import { DeleteCampaignButton } from "@/components/admin/delete-campaign-button";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-saveo-emerald-100 text-saveo-emerald-800",
  INACTIVE: "bg-black/5 text-saveo-emerald-700/50",
  SCHEDULED: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-red-100 text-red-700",
};

export default async function AdminCampaignsPage() {
  const [campaigns, products] = await Promise.all([
    CampaignService.getAll(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
  ]);
  const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;

  const statsByCampaign = await Promise.all(campaigns.map((c) => CampaignService.getStats(c.id)));

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketing Campaigns</h1>
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${activeCount >= 2 ? "bg-amber-100 text-amber-700" : "bg-black/5 text-saveo-emerald-700/60"}`}>
          {activeCount} / {CampaignService.MAX_ACTIVE} active
        </span>
      </div>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">Only 2 campaigns may be ACTIVE at the same time.</p>

      <CreateHuntForm products={products} />

      <div className="space-y-4">
        {campaigns.map((campaign, i) => {
          const stats = statsByCampaign[i];
          return (
            <div key={campaign.id} className="rounded-xl2 border border-black/5 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{campaign.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[campaign.status]}`}>{campaign.status}</span>
                  </div>
                  <p className="text-xs text-saveo-emerald-700/40">{campaign.type} · /{campaign.slug}</p>
                  {(() => {
                    const info = CAMPAIGN_TYPE_INFO[campaign.type];
                    if (!info) return null;
                    return info.isImplemented ? (
                      <p className="mt-1 text-[11px] text-saveo-emerald-700/60">{info.adminSummary}</p>
                    ) : (
                      <p className="mt-1 rounded bg-saveo-gold-50 px-2 py-1 text-[11px] font-semibold text-saveo-gold-700">
                        ⚠️ Not implemented — this is a reserved name only. Activating it shows customers nothing real.
                      </p>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="mb-0.5 block text-[10px] font-semibold text-saveo-emerald-700/50">Priority</label>
                    <PriorityInput campaignId={campaign.id} priority={campaign.priority} />
                  </div>
                  <CampaignActivationToggle campaignId={campaign.id} status={campaign.status} />
                  <a href={`/en/${campaign.slug}`} target="_blank" rel="noreferrer" className="btn-outline !py-2 text-sm">
                    Preview
                  </a>
                  <DeleteCampaignButton campaignId={campaign.id} campaignName={campaign.name} />
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-[10px] font-semibold text-saveo-emerald-700/50">Schedule</label>
                <ScheduleControl
                  campaignId={campaign.id}
                  startAt={campaign.startAt?.toISOString() ?? null}
                  endAt={campaign.endAt?.toISOString() ?? null}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-4 sm:grid-cols-5">
                <div><p className="text-[10px] text-saveo-emerald-700/50">Participants</p><p className="font-bold">{stats.participants}</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Rewards Given</p><p className="font-bold">{stats.rewardsGiven}</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Revenue</p><p className="font-bold">{formatKWD(stats.revenueGenerated)}</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Conversion</p><p className="font-bold">{stats.conversionRate.toFixed(1)}%</p></div>
                <div><p className="text-[10px] text-saveo-emerald-700/50">Returning Users</p><p className="font-bold">{stats.returningUsers}</p></div>
              </div>

              <CollapsibleRewardEditor campaignId={campaign.id} type={campaign.type} config={campaign.config} />
              {CAMPAIGN_TYPE_INFO[campaign.type]?.isImplemented && (
                <CampaignCustomerCopyEditor
                  campaignId={campaign.id}
                  initialEn={campaign.customerDescription ?? ""}
                  initialAr={campaign.customerDescriptionAr ?? ""}
                />
              )}
            </div>
          );
        })}
        {campaigns.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No campaigns yet — run the seed script.
          </div>
        )}
      </div>
    </div>
  );
}
