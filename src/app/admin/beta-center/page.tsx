import { prisma } from "@/lib/prisma";
import { BetaService } from "@/lib/services/beta-service";
import { formatKWD } from "@/lib/utils";
import { BetaStatusControls, FeatureFlagToggle } from "@/components/admin/beta-center-controls";

const FLAG_LABELS: Record<string, string> = {
  mystery_boxes: "Mystery Boxes",
  flash_deals: "Flash Deals",
  saveo_plus: "Savo Plus",
  recommendations: "Recommendations",
  brand_ads: "Brand Ads",
  new_discovery_features: "New Discovery Features",
  affiliate_program: "Affiliate Program",
};

const LAUNCH_FLAG_LABELS: Record<string, string> = {
  SAVE_AI_ENABLED: "Savo AI Shopping Assistant",
  ADVANCED_RECOMMENDATIONS_ENABLED: "Advanced Recommendation Engine",
  MYSTERY_BOX_ENABLED: "Mystery Boxes",
  SAVEO_PLUS_ENABLED: "Savo Plus",
  GAMIFICATION_ENABLED: "Gamification (Treasure Chest, Golden Ticket, Treasure Map, Mystery Safe, Hunt)",
  ADVANCED_DEAL_OF_HOUR_ENABLED: "Advanced Deal of the Hour",
  SMART_CROSS_SELLING_ENABLED: "Smart Cross-Selling (Frequently Bought Together)",
};

export default async function BetaCenterPage() {
  const [settings, invitedCustomers, invitedSuppliers, registeredCustomers, totalCustomers, approvedSuppliers, pendingSuppliers, totalOrders, salesAgg, openIssues, flags] =
    await Promise.all([
      BetaService.getSettings(),
      prisma.betaInvite.count({ where: { type: "CUSTOMER" } }),
      prisma.betaInvite.count({ where: { type: "SUPPLIER" } }),
      prisma.betaInvite.count({ where: { type: "CUSTOMER", status: "REGISTERED" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.supplier.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.supplier.count({ where: { verificationStatus: "PENDING" } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.orderIssue.count({ where: { status: { not: "RESOLVED" } } }),
      prisma.featureFlag.findMany({ orderBy: { key: "asc" } }),
    ]);

  const conversionPct = invitedCustomers > 0 ? ((registeredCustomers / invitedCustomers) * 100).toFixed(1) : "—";
  const launchFlags = flags.filter((f) => f.key in LAUNCH_FLAG_LABELS);
  const operationalFlags = flags.filter((f) => f.key in FLAG_LABELS);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Beta Command Center</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Beta Status</h2>
          <BetaStatusControls
            initial={{
              enabled: settings.enabled,
              inviteOnly: settings.inviteOnly,
              startDate: settings.startDate?.toISOString() ?? null,
              endDate: settings.endDate?.toISOString() ?? null,
            }}
          />
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 font-bold">🚀 Launch Mode — Feature Areas</h2>
          <p className="mb-4 text-xs text-saveo-emerald-700/50">
            Live on/off control for entire feature areas hidden at launch. Toggling one ON here makes it visible to customers immediately — no code change or redeploy needed. Everything stays built underneath either way.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {launchFlags.map((flag) => (
              <FeatureFlagToggle key={flag.key} flagKey={flag.key} name={LAUNCH_FLAG_LABELS[flag.key] ?? flag.name} enabled={flag.enabled} />
            ))}
            {launchFlags.length === 0 && (
              <p className="text-sm text-saveo-emerald-700/40">No launch flags seeded yet — run the seed script.</p>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold">Feature Flags</h2>
          <div className="space-y-2">
            {operationalFlags.map((flag) => (
              <FeatureFlagToggle key={flag.key} flagKey={flag.key} name={FLAG_LABELS[flag.key] ?? flag.name} enabled={flag.enabled} />
            ))}
            {operationalFlags.length === 0 && (
              <p className="text-sm text-saveo-emerald-700/40">No flags seeded yet — run the seed script.</p>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold">Users</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-saveo-emerald-700/50">Invited</dt><dd className="font-bold">{invitedCustomers}</dd></div>
            <div className="flex justify-between"><dt className="text-saveo-emerald-700/50">Active (all customers)</dt><dd className="font-bold">{totalCustomers}</dd></div>
            <div className="flex justify-between"><dt className="text-saveo-emerald-700/50">Conversion (invite → registered)</dt><dd className="font-bold">{conversionPct}%</dd></div>
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold">Suppliers</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-saveo-emerald-700/50">Invited</dt><dd className="font-bold">{invitedSuppliers}</dd></div>
            <div className="flex justify-between"><dt className="text-saveo-emerald-700/50">Approved</dt><dd className="font-bold">{approvedSuppliers}</dd></div>
            <div className="flex justify-between"><dt className="text-saveo-emerald-700/50">Pending</dt><dd className="font-bold">{pendingSuppliers}</dd></div>
          </dl>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-bold">Orders</h2>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div><dt className="text-saveo-emerald-700/50">Total Orders</dt><dd className="text-xl font-black">{totalOrders}</dd></div>
            <div><dt className="text-saveo-emerald-700/50">Sales</dt><dd className="text-xl font-black">{formatKWD(Number(salesAgg._sum.total ?? 0))}</dd></div>
            <div><dt className="text-saveo-emerald-700/50">Open Issues</dt><dd className="text-xl font-black">{openIssues}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
