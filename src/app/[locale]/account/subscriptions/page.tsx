import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { formatKWD } from "@/lib/utils";
import { SubscriptionControls } from "@/components/account/subscription-controls";

/**
 * SAVO Subscribe & Save — exact V22 visual transplant (AccountPage
 * 'subscriptions' section, V22 CustomerPages.tsx). Real business logic
 * unchanged: same SubscriptionService.getForUser() query, same
 * SubscriptionControls (Pause/Resume/Cancel — the only 3 real
 * management actions that exist today, confirmed by a prior full
 * read-only audit).
 *
 * Per that audit's explicit "design-safe scope", this UI deliberately
 * does NOT offer: change quantity/frequency/next-delivery-date, skip
 * delivery, change address, or change payment method — none of these
 * have a real backend action. The subscription is always fulfilled as
 * Cash on Delivery with the customer's default address at processing
 * time (not shown here as an editable field, since it isn't one).
 */
export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/subscriptions");

  const [subscriptions, locale] = await Promise.all([
    SubscriptionService.getForUser(session.user.id),
    getLocale(),
  ]);

  const isArabic = locale === "ar";
  const FREQUENCY_LABEL: Record<string, { en: string; ar: string }> = {
    WEEKLY: { en: "Weekly", ar: "أسبوعياً" },
    BIWEEKLY: { en: "Every 2 weeks", ar: "كل أسبوعين" },
    MONTHLY: { en: "Monthly", ar: "شهرياً" },
  };

  return (
    <div className="savo-subs-page">
      <h1 className="savo-subs-title">{isArabic ? "اشترك ووفّر" : "Subscribe & Save"}</h1>

      {subscriptions.length === 0 ? (
        <div className="savo-subs-empty">
          <p>{isArabic ? "صفر اشتراكات بعد — دوّر على \"اشترك ووفّر\" بأي صفحة منتج." : 'No subscriptions yet — look for "Subscribe & Save" on any product page.'}</p>
          <Link href="/products" className="savo-subs-empty-cta">{isArabic ? "تصفح المنتجات →" : "Browse Products →"}</Link>
        </div>
      ) : (
        <div className="savo-subs-list">
          {subscriptions.map((sub) => {
            const price = Number(sub.product.saveoPrice) * (1 - sub.discountPercent / 100) * sub.quantity;
            const freq = FREQUENCY_LABEL[sub.frequency];
            return (
              <div key={sub.id} className="savo-sub-card">
                <div className="savo-sub-img">
                  {sub.product.images[0] && <img src={sub.product.images[0].url} alt="" />}
                </div>
                <div className="savo-sub-body">
                  <p className="savo-sub-name">{sub.product.name}</p>
                  <p className="savo-sub-meta">{isArabic ? freq.ar : freq.en} · {isArabic ? "التالي" : "Next"}: {new Date(sub.nextDeliveryDate).toLocaleDateString(isArabic ? "ar-KW" : "en-GB")}</p>
                  <p className="savo-sub-price">{formatKWD(price)} / {isArabic ? "توصيلة" : "delivery"}</p>
                </div>
                <div className="savo-sub-right">
                  <span className="savo-sub-save">{isArabic ? `توفير ${sub.discountPercent}%` : `Save ${sub.discountPercent}%`}</span>
                  <SubscriptionControls subscriptionId={sub.id} status={sub.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
