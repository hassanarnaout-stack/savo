"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { formatKWD } from "@/lib/utils";
import { SubscriptionControls } from "@/components/account/subscription-controls";

interface Subscription {
  id: string;
  quantity: number;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  discountPercent: number;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  nextDeliveryDate: string;
  product: { name: string; brandName: string | null; saveoPrice: number; images: { url: string }[] };
}

const FREQUENCY_LABEL: Record<string, { en: string; ar: string }> = {
  WEEKLY: { en: "Every week", ar: "أسبوعياً" },
  BIWEEKLY: { en: "Every 2 weeks", ar: "كل أسبوعين" },
  MONTHLY: { en: "Every month", ar: "شهرياً" },
};

type Filter = "ALL" | "ACTIVE" | "PAUSED" | "CANCELLED";

/**
 * SAVO Subscribe & Save — enhanced management view (stat summary +
 * filter tabs + richer subscription cards) requested on top of the
 * base V22 transplant. Every number here is computed from REAL
 * subscription data (zero invented brands/products/stats):
 *   - Active/Paused/Cancelled counts: real status tally
 *   - Next delivery: the soonest nextDeliveryDate among ACTIVE subs
 *   - Savings: the real discountPercent (10% today for every real
 *     subscription per the standing audit — not a fabricated number)
 * Pause/Resume/Cancel still go through the same real
 * SubscriptionControls -> /api/subscriptions/[id] as before.
 */
interface EligibleProduct {
  id: string;
  name: string;
  nameAr: string | null;
  brandName: string | null;
  saveoPrice: number;
  images: { url: string }[];
}

function EligibleProductCard({ product, isArabic }: { product: EligibleProduct; isArabic: boolean }) {
  const router = useRouter();
  const [frequency, setFrequency] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("MONTHLY");
  const [saving, setSaving] = useState(false);
  const discountedPrice = product.saveoPrice * 0.9;

  async function handleSubscribe() {
    setSaving(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1, frequency }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? (isArabic ? "تعذّر الاشتراك" : "Could not subscribe"));
      }
      toast.success(isArabic ? "تم الاشتراك!" : "Subscribed!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? (isArabic ? "تعذّر الاشتراك" : "Could not subscribe"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="savo-subs-eligible-card">
      <div className="savo-subs-eligible-img">
        {product.images[0] && <img src={product.images[0].url} alt="" />}
      </div>
      {product.brandName && <p className="savo-sub-brand">{product.brandName}</p>}
      <p className="savo-subs-eligible-name">{isArabic && product.nameAr ? product.nameAr : product.name}</p>
      <p className="savo-subs-eligible-price">{formatKWD(discountedPrice)} <span>{isArabic ? "بدل" : "vs"} {formatKWD(product.saveoPrice)}</span></p>
      <div className="savo-subs-eligible-actions">
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="savo-subs-eligible-select">
          <option value="WEEKLY">{isArabic ? "أسبوعياً" : "Weekly"}</option>
          <option value="BIWEEKLY">{isArabic ? "كل أسبوعين" : "Every 2 weeks"}</option>
          <option value="MONTHLY">{isArabic ? "شهرياً" : "Monthly"}</option>
        </select>
        <button onClick={handleSubscribe} disabled={saving} className="savo-subs-eligible-btn">{saving ? "..." : (isArabic ? "اشترك" : "Subscribe")}</button>
      </div>
    </div>
  );
}

export function SubscriptionsManager({ subscriptions, eligibleProducts, isArabic }: { subscriptions: Subscription[]; eligibleProducts: EligibleProduct[]; isArabic: boolean }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const activeSubs = subscriptions.filter((s) => s.status === "ACTIVE");
  const pausedSubs = subscriptions.filter((s) => s.status === "PAUSED");
  const cancelledSubs = subscriptions.filter((s) => s.status === "CANCELLED");
  const nextDelivery = activeSubs
    .map((s) => new Date(s.nextDeliveryDate))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const commonSavings = activeSubs[0]?.discountPercent ?? subscriptions[0]?.discountPercent;

  const filtered = filter === "ALL" ? subscriptions : subscriptions.filter((s) => s.status === filter);

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: "ALL", label: isArabic ? "الكل" : "All", count: subscriptions.length },
    { key: "ACTIVE", label: isArabic ? "نشط" : "Active", count: activeSubs.length },
    { key: "PAUSED", label: isArabic ? "متوقف" : "Paused", count: pausedSubs.length },
    { key: "CANCELLED", label: isArabic ? "ملغي" : "Cancelled", count: cancelledSubs.length },
  ];

  return (
    <div>
      <div className="savo-subs-hero">
        <p className="savo-subs-hero-eyebrow">{isArabic ? "اشترك ووفّر" : "Subscribe & Save"}</p>
        <h1 className="savo-subs-hero-title">
          {isArabic ? <>مفضلاتك اليومية.<br />بشكل متكرر.</> : <>Your everyday favorites.<br />On repeat.</>}
        </h1>
        <p className="savo-subs-hero-sub">
          {isArabic ? "وفّر على المنتجات اللي تشتريها بانتظام وخلّي توصيلاتك بموعدها." : "Save on products you buy regularly and keep your deliveries on schedule."}
        </p>
      </div>

      {subscriptions.length > 0 && (
        <div className="savo-subs-stats">
          <div className="savo-subs-stat">
            <span className="savo-subs-stat-label">{isArabic ? "نشط" : "Active"}</span>
            <span className="savo-subs-stat-value">{activeSubs.length}</span>
          </div>
          <div className="savo-subs-stat">
            <span className="savo-subs-stat-label">{isArabic ? "التوصيل القادم" : "Next Delivery"}</span>
            <span className="savo-subs-stat-value savo-subs-stat-value--sm">{nextDelivery ? nextDelivery.toLocaleDateString(isArabic ? "ar-KW" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
          </div>
          <div className="savo-subs-stat">
            <span className="savo-subs-stat-label">{isArabic ? "التوفير" : "Savings"}</span>
            <span className="savo-subs-stat-value savo-subs-stat-value--gold">{commonSavings ?? 0}%</span>
          </div>
          {pausedSubs.length > 0 && (
            <div className="savo-subs-stat">
              <span className="savo-subs-stat-label">{isArabic ? "متوقف" : "Paused"}</span>
              <span className="savo-subs-stat-value">{pausedSubs.length}</span>
            </div>
          )}
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="savo-subs-empty">
          <p>{isArabic ? "صفر اشتراكات بعد — دوّر على \"اشترك ووفّر\" بأي صفحة منتج." : 'No subscriptions yet — look for "Subscribe & Save" on any product page.'}</p>
          <Link href="/products" className="savo-subs-empty-cta">{isArabic ? "تصفح المنتجات →" : "Browse Products →"}</Link>
        </div>
      ) : (
        <>
          <div className="savo-subs-tabs">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={`savo-subs-tab ${filter === tab.key ? "is-active" : ""}`}>
                {tab.label}<span className="savo-subs-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="savo-subs-list">
            {filtered.map((sub) => {
              const freq = FREQUENCY_LABEL[sub.frequency];
              const price = Number(sub.product.saveoPrice) * (1 - sub.discountPercent / 100);
              return (
                <div key={sub.id} className={`savo-sub-card savo-sub-card--rich savo-sub-card--${sub.status.toLowerCase()}`}>
                  <div className="savo-sub-img">
                    {sub.product.images[0] && <img src={sub.product.images[0].url} alt="" />}
                  </div>
                  <div className="savo-sub-body">
                    {sub.product.brandName && <p className="savo-sub-brand">{sub.product.brandName}</p>}
                    <p className="savo-sub-name">{sub.product.name}</p>
                    <div className="savo-sub-status-row">
                      <span className={`savo-sub-status-pill savo-sub-status-pill--${sub.status.toLowerCase()}`}>{sub.status}</span>
                      <span className="savo-sub-meta">
                        {isArabic ? freq.ar : freq.en}
                        {sub.status === "PAUSED" && ` · ${isArabic ? "متوقف — صفر توصيل قادم" : "Paused — no upcoming delivery"}`}
                        {sub.status === "ACTIVE" && ` · ${isArabic ? "التوصيل القادم" : "Next delivery"} ${new Date(sub.nextDeliveryDate).toLocaleDateString(isArabic ? "ar-KW" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                      </span>
                    </div>
                    <p className="savo-sub-price-row">
                      <span className="savo-sub-save-tag">{isArabic ? `وفّر ${sub.discountPercent}%` : `SAVE ${sub.discountPercent}%`}</span>
                      {formatKWD(price)} · {isArabic ? "الكمية" : "Qty"} {sub.quantity}
                    </p>
                  </div>
                  <div className="savo-sub-right">
                    <SubscriptionControls subscriptionId={sub.id} status={sub.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {eligibleProducts.length > 0 && (
        <div className="savo-subs-eligible-section">
          <p className="savo-subs-section-label">{isArabic ? "متاح للاشتراك" : "Eligible for Subscribe & Save"}</p>
          <div className="savo-subs-eligible-grid">
            {eligibleProducts.map((p) => (
              <EligibleProductCard key={p.id} product={p} isArabic={isArabic} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
