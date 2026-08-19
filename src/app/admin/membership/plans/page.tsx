import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { PlanBenefitRow } from "@/components/admin/plan-benefit-row";
import { PricingOptionRow } from "@/components/admin/pricing-option-row";
import { CreateBenefitControl } from "@/components/admin/create-benefit-control";

export default async function AdminMembershipPlansPage() {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      pricingOptions: { orderBy: { billingCycle: "asc" } },
      benefits: true,
      _count: { select: { memberships: true } },
    },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Membership Plans</h1>

      <div className="space-y-6">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl2 border border-black/5 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{plan.name}</h2>
                <p className="text-xs text-saveo-emerald-700/50">
                  {plan._count.memberships} total members · {plan.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-saveo-emerald-700/50">Pricing</h3>
                <div className="space-y-2">
                  {plan.pricingOptions.map((option) => (
                    <PricingOptionRow key={option.id} option={{ ...option, price: Number(option.price) }} />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-saveo-emerald-700/50">Benefits</h3>
                <div className="space-y-2">
                  {plan.benefits.map((benefit) => (
                    <PlanBenefitRow
                      key={benefit.id}
                      benefit={{ ...benefit, value: benefit.value ? Number(benefit.value) : null }}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <CreateBenefitControl planId={plan.id} existingKeys={plan.benefits.map((b) => b.key)} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No membership plans yet — run the seed script or create one directly in the database.
          </div>
        )}
      </div>
    </div>
  );
}
