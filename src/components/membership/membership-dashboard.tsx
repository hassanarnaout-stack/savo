import { MembershipService } from "@/lib/services/membership-service";
import { BenefitEngine } from "@/lib/services/benefit-engine";
import { formatKWD } from "@/lib/utils";
import { PlusBadge } from "@/components/membership/plus-badge";
import { SubscribeButton, CancelMembershipButton } from "@/components/membership/membership-actions";
import { Crown, Calendar, TrendingUp, Sparkles } from "lucide-react";

export async function MembershipDashboard({ userId, locale }: { userId: string; locale: string }) {
  const membership = await MembershipService.getUserMembership(userId);
  const isActive = !!membership && membership.status === "ACTIVE" && membership.endsAt > new Date();

  if (!isActive || !membership) {
    return <MembershipUpsell locale={locale} />;
  }

  const [savings, benefits] = await Promise.all([
    MembershipService.getSavings(userId),
    Promise.resolve(BenefitEngine.listActiveBenefits(membership as any, locale === "ar" ? "ar" : "en")),
  ]);

  const planName = locale === "ar" && membership.plan.nameAr ? membership.plan.nameAr : membership.plan.name;

  return (
    <div className="card overflow-hidden">
      <div className="saveo-aura relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-saveo-emerald-800 to-saveo-emerald-700 p-5 text-white">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-saveo-gold-400" />
          <div>
            <p className="font-bold">{planName}</p>
            <p className="text-xs text-white/60">{membership.pricingOption.billingCycle === "YEARLY" ? "Yearly" : "Monthly"} · {formatKWD(Number(membership.pricingOption.price))}</p>
          </div>
        </div>
        <PlusBadge size="md" />
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-saveo-emerald-700/40" />
          <div>
            <p className="text-xs text-saveo-emerald-700/50">Renews on</p>
            <p className="font-bold">{new Date(membership.endsAt).toLocaleDateString("en-GB")}</p>
            {!membership.autoRenew && <p className="text-[11px] text-red-600">Auto-renew off — ends this date</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-saveo-emerald-700/40" />
          <div>
            <p className="text-xs text-saveo-emerald-700/50">Savings this month</p>
            <p className="font-bold text-saveo-emerald-700">{formatKWD(savings.savingsThisMonth)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Sparkles className="h-8 w-8 text-saveo-emerald-700/40" />
          <div>
            <p className="text-xs text-saveo-emerald-700/50">Lifetime savings with Savo Plus</p>
            <p className="text-lg font-extrabold text-saveo-emerald-700">{formatKWD(savings.savingsLifetime)}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 p-5">
        <p className="mb-2 text-xs font-bold uppercase text-saveo-emerald-700/50">Your Benefits</p>
        <ul className="space-y-1.5 text-sm">
          {benefits.map((b) => (
            <li key={b.key} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-saveo-gold-500" />
              {b.label}
              {b.value ? ` (${b.value}${b.key === "EXTRA_DISCOUNT" ? "%" : ""})` : ""}
            </li>
          ))}
        </ul>
      </div>

      {membership.autoRenew && (
        <div className="border-t border-black/5 p-5">
          <CancelMembershipButton />
        </div>
      )}
    </div>
  );
}

async function MembershipUpsell({ locale }: { locale: string }) {
  const plans = await MembershipService.getActivePlans();
  const plan = plans[0]; // ships with one plan; UI supports more automatically
  if (!plan) return null;

  const planName = locale === "ar" && plan.nameAr ? plan.nameAr : plan.name;
  const benefits = plan.benefits;

  return (
    <div className="card overflow-hidden bg-gradient-to-br from-saveo-emerald-800 to-saveo-emerald-700 text-white">
      <div className="p-6">
        <Crown className="h-8 w-8 text-saveo-gold-400" />
        <h3 className="mt-2 text-xl font-black">{planName}</h3>
        <p className="mt-1 text-sm text-white/60">
          {locale === "ar" && plan.descriptionAr ? plan.descriptionAr : plan.description}
        </p>
        <ul className="mt-4 space-y-1.5 text-sm">
          {benefits.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-saveo-gold-400" />
              {(locale === "ar" ? b.labelAr : b.label) ?? b.key.replace(/_/g, " ")}
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {plan.pricingOptions.map((option) => (
            <div key={option.id} className="rounded-xl2 bg-white/10 p-4">
              <p className="text-xs text-white/60">{option.billingCycle === "YEARLY" ? "Yearly" : "Monthly"}</p>
              <p className="text-lg font-extrabold">{formatKWD(Number(option.price))}</p>
              <div className="mt-2">
                <SubscribeButton planId={plan.id} pricingOptionId={option.id} label="Join Now" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
