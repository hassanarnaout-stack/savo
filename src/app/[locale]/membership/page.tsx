import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { MembershipService } from "@/lib/services/membership-service";
import { BenefitEngine } from "@/lib/services/benefit-engine";
import { formatKWD } from "@/lib/utils";
import { SAVOLogo } from "@/components/brand/savo-master-logo";
import { SubscribeButton, CancelMembershipButton } from "@/components/membership/membership-actions";
import { PlusDropSection } from "@/components/membership/plus-drop-section";
import { BoxIllustration } from "@/components/mystery-box/mystery-box-visuals";
import { getPlusDropProducts } from "@/lib/discovery-engine";
import { Link } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const BENEFIT_ICON: Record<string, string> = {
  EXTRA_DISCOUNT: "💰", EARLY_ACCESS: "⏱️", EXCLUSIVE_DEALS: "🎯",
  FREE_DELIVERY: "🚚", PLUS_BADGE: "⭐", MYSTERY_BOX_BONUS: "🎁", DOUBLE_REWARD_POINTS: "✨",
};

/**
 * SAVO Plus — the ONE canonical customer membership experience.
 * Approved Figma visual reference reproduced inside the real V22
 * storefront, backed 100% by the existing MembershipService/
 * BenefitEngine/Membership architecture — zero parallel membership
 * system, zero hardcoded benefits, zero demo member-state toggle.
 * Real states only: NON-MEMBER vs ACTIVE MEMBER (isActiveMember()).
 */
export default async function MembershipPage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  const isArabic = locale === "ar";

  const plans = await MembershipService.getActivePlans();
  const plan = plans[0] ?? null;

  const membership = session?.user?.id ? await MembershipService.getUserMembership(session.user.id) : null;
  const isMember = !!membership && membership.status === "ACTIVE" && membership.endsAt > new Date();

  const savings = isMember && session?.user?.id ? await MembershipService.getSavings(session.user.id) : null;
  const plusDropProductsRaw = await getPlusDropProducts(4);
  const plusDropProducts = plusDropProductsRaw.map((p) => ({
    id: p.id, name: p.name, nameAr: p.nameAr, slug: p.slug, brandName: p.brandName,
    originalPrice: Number(p.originalPrice), saveoPrice: Number(p.saveoPrice),
    image: p.images[0]?.url ?? null,
    isMembersOnly: p.isMembersOnly,
    plusPrice: p.plusPrice ? Number(p.plusPrice) : null,
    earlyAccessStartsAt: p.earlyAccessStartsAt ? p.earlyAccessStartsAt.toISOString() : null,
    publicAccessStartsAt: p.publicAccessStartsAt ? p.publicAccessStartsAt.toISOString() : null,
  }));
  const benefits = isMember
    ? BenefitEngine.listActiveBenefits(membership as any, isArabic ? "ar" : "en")
    : plan
    ? plan.benefits.filter((b) => b.isEnabled).map((b) => ({ key: b.key, label: (isArabic ? b.labelAr : b.label) ?? b.key.replace(/_/g, " "), value: b.value ? Number(b.value) : null }))
    : [];

  const cheapestOption = plan?.pricingOptions.find((o) => o.isActive) ?? plan?.pricingOptions[0] ?? null;

  return (
    <main className="savo-plus-page">
      {/* 01 — HERO */}
      <section id="savo-plus-hero" className="savo-plus-hero">
        <div className="savo-plus-hero-copy">
          <p className="savo-plus-hero-eyebrow">✦ {isArabic ? "سافو بلس" : "SAVO PLUS"}</p>
          <h1 className="savo-plus-hero-title">
            {isArabic ? <>المزيد من سافو.<br />المزيد من القيمة.</> : <>More SAVO.<br />More Value.</>}
          </h1>
          <p className="savo-plus-hero-sub">
            {isArabic
              ? "عضويتك لاكتشافات أفضل، وصول حصري، وقيمة أكبر في كل مرة تتسوّق فيها."
              : "Your membership to better discoveries, exclusive access, and more value every time you shop."}
          </p>

          {isMember ? (
            <div className="savo-plus-hero-actions">
              <span className="savo-plus-active-pill"><span>●</span> {isArabic ? "عضويتك نشطة" : "YOUR PLUS IS ACTIVE"}</span>
              <CancelMembershipButton />
            </div>
          ) : plan && cheapestOption ? (
            <div className="savo-plus-hero-actions">
              <div>
                <SubscribeButton planId={plan.id} pricingOptionId={cheapestOption.id} label={isArabic ? "انضم لسافو بلس" : "JOIN SAVO PLUS"} />
                <p className="savo-plus-hero-price">
                  {isArabic ? "يبدأ من " : "from "}<b>{formatKWD(Number(cheapestOption.price))}</b>{isArabic ? ` / ${cheapestOption.billingCycle === "YEARLY" ? "سنة" : "شهر"}` : ` / ${cheapestOption.billingCycle === "YEARLY" ? "year" : "month"}`}
                </p>
              </div>
            </div>
          ) : (
            <p className="savo-plus-hero-price">{isArabic ? "لا توجد خطة نشطة حاليًا." : "No active plan configured right now."}</p>
          )}
        </div>

        {/* Membership card — official SAVOLogo reused, small refined PLUS ✦ beneath it */}
        <div className="savo-plus-card" data-member={isMember}>
          <div className="savo-plus-card-shimmer" />
          <div className="savo-plus-card-top">
            <SAVOLogo variant="primary-light" pointColor={isMember ? "#f0a500" : "#00D4A1"} style={{ height: 22, width: "auto" }} />
            <span className="savo-plus-card-badge">✦ PLUS</span>
          </div>
          <div className="savo-plus-card-mid">
            {isMember ? (
              <>
                <p className="savo-plus-card-label" data-active="true">{isArabic ? "عضو نشط" : "ACTIVE MEMBER"}</p>
                <p className="savo-plus-card-since">
                  {isArabic ? "عضو منذ " : "Member since "}
                  {new Date(membership!.startsAt).toLocaleDateString(isArabic ? "ar-KW" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </>
            ) : (
              <>
                <p className="savo-plus-card-label" data-dim="true">{isArabic ? "غير نشط" : "NOT ACTIVE"}</p>
                <p className="savo-plus-card-value" data-dim="true">{isArabic ? "افتح المزيد" : "UNLOCK MORE"}</p>
              </>
            )}
          </div>
          <div className="savo-plus-card-bottom">
            <div>
              <p className="savo-plus-card-foot">{isArabic ? "سافو بلس" : "SAVO PLUS"}</p>
              <span className="savo-plus-card-bar" />
            </div>
            <span className="savo-plus-card-star">✦</span>
          </div>
        </div>
      </section>

      {/* 02 — BENEFITS (single source: admin-managed MembershipPlanBenefit) */}
      {benefits.length > 0 && (
        <section className="savo-plus-section">
          <p className="savo-plus-eyebrow-sm">{isArabic ? "مزايا العضوية" : "MEMBERSHIP BENEFITS"}</p>
          <h2 className="savo-plus-h2">{isArabic ? "عالمك مع بلس." : "Your Plus World."}</h2>
          <div className="savo-plus-benefits-grid">
            {benefits.map((b) => (
              <div key={b.key} className="savo-plus-benefit-card">
                <div className="savo-plus-benefit-icon">{BENEFIT_ICON[b.key] ?? "✓"}</div>
                <h3>{b.label}{b.value ? ` (${b.value}${b.key === "EXTRA_DISCOUNT" ? "%" : ""})` : ""}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 03 — GOLD BOX — exact Figma section transplant (04 GOLD BOX). Visual layer from Figma; CTA connects to the real canonical Gold Box (/mystery-boxes) and real subscribe flow (Hero anchor) — zero Figma demo logic kept. */}
      <section id="savo-gold-box" className="savo-plus-goldbox-figma" data-locked={!isMember}>
        <div>
          <p className="savo-plus-goldbox-eyebrow">{isArabic ? "حصري لأعضاء بلس" : "PLUS EXCLUSIVE"}</p>
          <h2 className="savo-plus-goldbox-headline">{isArabic ? "صندوقك الذهبي بانتظارك." : <>Your Gold Box Awaits.</>}</h2>
          <p className="savo-plus-goldbox-sub">
            {isArabic ? <>اكتشافات حصرية.<br />محجوزة لأعضاء سافو بلس.</> : <>Exclusive discoveries.<br />Reserved for SAVO Plus.</>}
          </p>
          {isMember ? (
            <Link href="/mystery-boxes" className="savo-plus-goldbox-figma-cta">
              {isArabic ? "ابنِ صندوقك الذهبي ←" : "BUILD YOUR GOLD BOX →"}
            </Link>
          ) : (
            <Link href="#savo-plus-hero" className="savo-plus-goldbox-figma-cta">
              {isArabic ? "افتح صندوق الذهب ←" : "UNLOCK GOLD BOX →"}
            </Link>
          )}
        </div>
        <div className="savo-plus-goldbox-figma-visual">
          <BoxIllustration isGold size={200} />
        </div>
      </section>

      {/* 03b — THE PLUS DROP (real qualifying products: Members Only / Early Access / Plus Price) */}
      <PlusDropSection products={plusDropProducts} isMember={isMember} locale={locale} />

      {/* 04 — VALUE / SAVINGS — real data only, no invented stats */}
      {isMember && savings && (
        <section className="savo-plus-section">
          <p className="savo-plus-eyebrow-sm">{isArabic ? "عضويتك" : "YOUR MEMBERSHIP"}</p>
          <h2 className="savo-plus-h2">{isArabic ? "قيمة بلس الحقيقية." : "Your Plus Value."}</h2>
          <div className="savo-plus-stats-grid">
            <div className="savo-plus-stat-card">
              <p className="savo-plus-stat-value" data-accent="teal">{formatKWD(savings.savingsThisMonth)}</p>
              <p className="savo-plus-stat-label">{isArabic ? "التوفير هذا الشهر" : "Savings this month"}</p>
            </div>
            <div className="savo-plus-stat-card">
              <p className="savo-plus-stat-value" data-accent="teal">{formatKWD(savings.savingsLifetime)}</p>
              <p className="savo-plus-stat-label">{isArabic ? "إجمالي التوفير" : "Lifetime savings"}</p>
            </div>
            <div className="savo-plus-stat-card">
              <p className="savo-plus-stat-value" data-accent="white">{new Date(membership!.endsAt).toLocaleDateString(isArabic ? "ar-KW" : "en-GB")}</p>
              <p className="savo-plus-stat-label">{isArabic ? "تاريخ التجديد" : "Renews on"}</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
