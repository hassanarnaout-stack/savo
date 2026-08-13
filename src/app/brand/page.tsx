import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrandRegisterForm } from "@/components/brand/brand-register-form";
import { formatKWD } from "@/lib/utils";
import { AIBrandAssistantService } from "@/lib/services/ai-brand-assistant-service";

export default async function BrandCenterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/brand");

  const brand = await prisma.brandAccount.findUnique({ where: { ownerUserId: session.user.id } });

  if (!brand) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <BrandRegisterForm />
      </div>
    );
  }

  if (brand.status === "PENDING") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-saveo-emerald-700">Application Under Review</h1>
        <p className="mt-2 text-sm text-saveo-emerald-700/50">
          Thanks for registering {brand.companyName}! Our team is reviewing your application — we'll notify you once approved.
        </p>
      </div>
    );
  }

  if (brand.status === "SUSPENDED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-red-600">Account Suspended</h1>
        <p className="mt-2 text-sm text-saveo-emerald-700/50">Contact Savo support for more information.</p>
      </div>
    );
  }

  const [impressions, clicks, purchaseEvents, products, campaigns, aiSuggestions] = await Promise.all([
    prisma.brandEvent.count({ where: { brandId: brand.id, eventType: "IMPRESSION" } }),
    prisma.brandEvent.count({ where: { brandId: brand.id, eventType: "CLICK" } }),
    prisma.brandEvent.findMany({ where: { brandId: brand.id, eventType: "PURCHASE" }, select: { metadata: true } }),
    prisma.sponsoredSlot.findMany({ where: { brandId: brand.id }, include: { product: { select: { name: true, saveoPrice: true } } } }),
    prisma.brandMarketingCampaign.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" } }),
    AIBrandAssistantService.getSuggestions(brand.id),
  ]);

  const sales = purchaseEvents.length;
  const revenue = purchaseEvents.reduce((sum, e) => sum + (typeof (e.metadata as any)?.orderTotal === "number" ? (e.metadata as any).orderTotal : 0), 0);
  const conversionRate = clicks > 0 ? (sales / clicks) * 100 : 0;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const pastCampaigns = campaigns.filter((c) => c.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-saveo-emerald-700">{brand.companyName}</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">Brand Dashboard</p>

      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Views</p><p className="text-xl font-bold">{impressions}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Clicks</p><p className="text-xl font-bold">{clicks}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Sales</p><p className="text-xl font-bold">{sales}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Revenue</p><p className="text-xl font-bold">{formatKWD(revenue)}</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Conversion</p><p className="text-xl font-bold">{conversionRate.toFixed(2)}%</p></div>
        <div className="card p-4"><p className="text-[10px] text-saveo-emerald-700/50">Sponsored Products</p><p className="text-xl font-bold">{products.length}</p></div>
      </section>


      {aiSuggestions.length > 0 && (
        <section className="mb-6 card border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-2 font-bold text-amber-700">💡 AI Suggestions</h2>
          <div className="space-y-1.5 text-sm text-amber-800">
            {aiSuggestions.map((s, i) => (
              <p key={i}>{s.reasoning}</p>
            ))}
          </div>
        </section>
      )}
      <section className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Your Sponsored Products</h2>
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span>{p.product.name}</span>
              <span className="text-saveo-emerald-700/50">{p.placementType} · {p.status}</span>
            </div>
          ))}
          {products.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No sponsored products yet.</p>}
        </div>
      </section>

      <section className="mb-6 card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-saveo-emerald-700">Active Campaigns ({activeCampaigns.length})</h2>
          <a href="/brand/campaigns/create" className="btn-primary !py-1.5 text-xs">+ New Campaign</a>
        </div>
        <div className="space-y-2">
          {activeCampaigns.map((c) => (
            <div key={c.id} className="flex justify-between text-sm">
              <span>{c.type.replace(/_/g, " ")}</span>
              <span className="text-saveo-emerald-700/50">Budget {formatKWD(Number(c.budget))}</span>
            </div>
          ))}
          {activeCampaigns.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No active campaigns.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Past Campaigns ({pastCampaigns.length})</h2>
        <div className="space-y-2">
          {pastCampaigns.map((c) => (
            <div key={c.id} className="flex justify-between text-sm">
              <span>{c.type.replace(/_/g, " ")}</span>
              <span className="text-saveo-emerald-700/50">Budget {formatKWD(Number(c.budget))}</span>
            </div>
          ))}
          {pastCampaigns.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No completed campaigns yet.</p>}
        </div>
      </section>
    </div>
  );
}
