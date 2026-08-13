import { prisma } from "@/lib/prisma";
import { CustomerBehaviorEngine } from "@/lib/services/customer-behavior-engine";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminCustomerIntelligencePage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER", orders: { some: {} } },
    select: { id: true, name: true, email: true },
    take: 100,
  });

  const withRisk = await Promise.all(
    customers.map(async (c) => ({ ...c, risk: await CustomerBehaviorEngine.getChurnRiskLevel(c.id) }))
  );

  const highRisk = withRisk.filter((c) => c.risk === "HIGH");
  const mediumRisk = withRisk.filter((c) => c.risk === "MEDIUM");

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Customer Intelligence" }]} />
      <h1 className="mb-2 text-2xl font-bold">Customer Intelligence</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Churn risk is a rule-based estimate (order recency), not a trained model — an honest placeholder for future AI.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-red-600">🔴 High Risk ({highRisk.length})</h2>
          <div className="space-y-1.5 text-sm">
            {highRisk.map((c) => <p key={c.id}>{c.name ?? c.email}</p>)}
            {highRisk.length === 0 && <p className="text-saveo-emerald-700/40">None right now.</p>}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-amber-600">🟡 Medium Risk ({mediumRisk.length})</h2>
          <div className="space-y-1.5 text-sm">
            {mediumRisk.map((c) => <p key={c.id}>{c.name ?? c.email}</p>)}
            {mediumRisk.length === 0 && <p className="text-saveo-emerald-700/40">None right now.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
