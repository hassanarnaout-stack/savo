import { Link } from "@/i18n/routing";
import { formatKWD } from "@/lib/utils";
import { SAVOLogo } from "@/components/brand/savo-master-logo";
import { MembershipService } from "@/lib/services/membership-service";
import { BenefitEngine } from "@/lib/services/benefit-engine";

/**
 * AccountPlusSummary — the SAME real SAVO Plus membership card used on
 * the canonical /membership page (identical .savo-plus-card markup/
 * classes — same official SAVOLogo, ✦ PLUS badge, shimmer, gold
 * footer/star), reused here as a COMPACT account summary rather than
 * duplicating the full Plus landing page. Zero legacy "Saveo Plus" /
 * crown / green-white card — that old MembershipDashboard-driven card
 * is retired and replaced by this component.
 *
 * Real data only, same sources as /membership:
 *   MembershipService.getUserMembership / isActiveMember / getSavings
 *   BenefitEngine.listActiveBenefits (real MembershipPlanBenefit)
 * Zero business logic here — cancellation/subscribe/renewal all stay
 * on the canonical /membership page; this only links there.
 */
export async function AccountPlusSummary({ userId, locale }: { userId: string; locale: string }) {
  const isArabic = locale === "ar";
  const membership = await MembershipService.getUserMembership(userId);
  const isMember = !!membership && membership.status === "ACTIVE" && membership.endsAt > new Date();
  const savings = isMember ? await MembershipService.getSavings(userId) : null;
  const benefits = isMember ? BenefitEngine.listActiveBenefits(membership as any, isArabic ? "ar" : "en") : [];

  return (
    <div className="savo-account-plus-card" data-member={isMember}>
      <div className="savo-plus-card-shimmer" />

      <div className="savo-account-plus-left">
        <div className="savo-plus-card-top">
          <SAVOLogo variant="primary-light" pointColor={isMember ? "#f0a500" : "#00D4A1"} style={{ height: 20, width: "auto" }} />
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
      </div>

      <div className="savo-account-plus-right">
        {isMember && (
          <div className="savo-account-plus-details">
            <div>
              <span>{isArabic ? "التجديد" : "Renews"}</span>
              <b>{new Date(membership!.endsAt).toLocaleDateString(isArabic ? "ar-KW" : "en-GB", { day: "numeric", month: "short" })}</b>
            </div>
            {savings && (
              <div>
                <span>{isArabic ? "إجمالي التوفير" : "Lifetime savings"}</span>
                <b>{formatKWD(savings.savingsLifetime)}</b>
              </div>
            )}
            {benefits.length > 0 && (
              <div>
                <span>{isArabic ? "المزايا النشطة" : "Active benefits"}</span>
                <b>{benefits.length}</b>
              </div>
            )}
          </div>
        )}

        <div className="savo-account-plus-right-bottom">
          <div className="savo-plus-card-bottom">
            <div>
              <p className="savo-plus-card-foot">{isArabic ? "سافو بلس" : "SAVO PLUS"}</p>
              <span className="savo-plus-card-bar" />
            </div>
            <span className="savo-plus-card-star">✦</span>
          </div>

          <Link href="/membership" className="savo-account-plus-manage">
            {isMember ? (isArabic ? "إدارة العضوية ←" : "Manage Membership →") : (isArabic ? "انضم لسافو بلس ←" : "Join SAVO Plus →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
