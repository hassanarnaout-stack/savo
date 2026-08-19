import { Link } from "@/i18n/routing";
import { formatKWD } from "@/lib/utils";

/**
 * SAVO Plus homepage section — approved V22 gold/dark visual. Real
 * plan, real active pricing option, real benefits (MembershipPlan /
 * MembershipPricingOption / MembershipPlanBenefit — zero hardcoded
 * "Free Delivery" etc.), real membership state via the existing
 * canonical MembershipService authority. Benefit ORDER currently
 * follows creation order (MembershipPlanBenefit has no sortOrder
 * column — a real, reported gap, not silently patched here).
 */
const BENEFIT_ICON: Record<string, string> = {
  EXTRA_DISCOUNT: "💰", EARLY_ACCESS: "⏱️", EXCLUSIVE_DEALS: "🎯",
  FREE_DELIVERY: "🚚", PLUS_BADGE: "⭐", MYSTERY_BOX_BONUS: "🎁", DOUBLE_REWARD_POINTS: "✨",
};

interface PlusBenefit {
  key: string;
  label: string | null;
  labelAr: string | null;
}

export function PlusSection({
  plan, price, benefits, isMember, locale,
}: {
  plan: { name: string; nameAr: string | null; description: string | null; descriptionAr: string | null } | null;
  price: number | null;
  benefits: PlusBenefit[];
  isMember: boolean;
  locale: string;
}) {
  const isArabic = locale === "ar";
  if (!plan) return null; // no active plan configured — real fallback, not fake content

  return (
    <section className="savo-plus">
      <div className="savo-plus-panel">
        <p className="savo-plus-eyebrow">{isArabic ? "سافو بلس" : "SAVO PLUS"}</p>
        <h2 className="savo-plus-title">{isArabic ? "عضوية. مرتقاة." : <>Membership.<br />Elevated.</>}</h2>
        {(isArabic ? plan.descriptionAr : plan.description) && (
          <p className="savo-plus-desc">{isArabic ? plan.descriptionAr : plan.description}</p>
        )}

        {benefits.length > 0 && (
          <div className="savo-plus-pills">
            {benefits.map((b) => {
              const label = isArabic && b.labelAr ? b.labelAr : b.label;
              if (!label) return null;
              return (
                <span key={b.key} className="savo-plus-pill">
                  <span>{BENEFIT_ICON[b.key] ?? "✓"}</span>
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {price !== null && (
          <p className="savo-plus-price">
            {isArabic ? "يبدأ من " : "from "}
            <b>{formatKWD(price)}</b>
            {isArabic ? " / شهر" : " / month"}
          </p>
        )}

        <Link href="/membership" className="savo-plus-cta">
          {isMember ? (isArabic ? "إدارة عضويتي" : "Manage Membership") : isArabic ? "انضم لسافو بلس" : "Join SAVO Plus"}
        </Link>
      </div>
    </section>
  );
}
