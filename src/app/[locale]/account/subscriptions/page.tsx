import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { SubscriptionsManager } from "@/components/account/subscriptions-manager";

/**
 * SAVO Subscribe & Save — enhanced V22 view: hero copy + real stat
 * summary + filter tabs + richer subscription cards (see
 * SubscriptionsManager). Real business logic byte-for-byte unchanged:
 * same SubscriptionService.getForUser() query, same
 * SubscriptionControls (Pause/Resume/Cancel — the only 3 real
 * management actions that exist, per the standing audit). Still
 * deliberately offers no quantity/frequency/address/payment editing,
 * skip-delivery, since none of those have a real backend action.
 */
export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/subscriptions");

  const [subscriptions, locale] = await Promise.all([
    SubscriptionService.getForUser(session.user.id),
    getLocale(),
  ]);

  return (
    <div className="savo-subs-page">
      <SubscriptionsManager subscriptions={subscriptions as any} isArabic={locale === "ar"} />
    </div>
  );
}
