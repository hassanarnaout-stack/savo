import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { formatKWD } from "@/lib/utils";
import { SubscriptionControls } from "@/components/account/subscription-controls";

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/subscriptions");

  const subscriptions = await SubscriptionService.getForUser(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-saveo-emerald-700">Subscribe &amp; Save</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">Your recurring deliveries.</p>

      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="card flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              {sub.product.images[0] && (
                <img src={sub.product.images[0].url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              )}
              <div>
                <p className="font-semibold">{sub.product.name}</p>
                <p className="text-xs text-saveo-emerald-700/50">
                  Qty {sub.quantity} · {sub.frequency} · {sub.discountPercent}% off · Next: {new Date(sub.nextDeliveryDate).toLocaleDateString("en-GB")}
                </p>
                <p className="text-xs font-semibold text-saveo-emerald-700">
                  {formatKWD(Number(sub.product.saveoPrice) * (1 - sub.discountPercent / 100) * sub.quantity)} / delivery
                </p>
              </div>
            </div>
            <SubscriptionControls subscriptionId={sub.id} status={sub.status} />
          </div>
        ))}
        {subscriptions.length === 0 && (
          <div className="card p-10 text-center text-saveo-emerald-700/40">
            No subscriptions yet — look for "Subscribe &amp; Save" on any product page.
          </div>
        )}
      </div>
    </div>
  );
}
