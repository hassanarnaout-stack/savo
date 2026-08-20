"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";

interface ShowcaseProduct {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  image: string;
  price: number;
}

/**
 * SAVO Login — left decorative identity panel (44% desktop width)
 * featuring a large, interactive 3-card product showcase (center
 * dominant, left/right counter-rotated) matching the approved visual
 * reference, populated entirely from REAL, Admin-selected catalog
 * products (Login Showcase Products, /admin/login-showcase,
 * LoginShowcaseService) — never hardcoded. Each card links to its
 * real product page. A missing slot (unconfigured / product became
 * unavailable) simply doesn't render its card — never a broken image.
 * Approved SAVO copy preserved for both the panel and the form side.
 * ALL business logic below is byte-for-byte unchanged from the
 * pre-migration version: same rate-limit pre-check, same next-auth
 * signIn call, same role-based redirect (ADMIN/SUPER_ADMIN -> /admin,
 * SUPPLIER -> /supplier, else -> /account or callbackUrl). Panel
 * height uses the real available viewport below the production
 * Header/Ticker (not a blind 100vh) so the bottom copy is never
 * clipped.
 */
export function LoginForm({ showcase }: { showcase: { left: ShowcaseProduct | null; center: ShowcaseProduct | null; right: ShowcaseProduct | null } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isArabic = locale === "ar";
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const rlRes = await fetch("/api/auth/rate-limit-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const rl = await rlRes.json();
      if (rl.limited) {
        setLoading(false);
        const minutes = Math.ceil(rl.retryAfterSeconds / 60);
        toast.error(`Too many login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
        return;
      }
    } catch {
      // fall through to the normal sign-in attempt
    }

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error(t("invalidCredentials"));
      return;
    }

    const session = await getSession();
    const role = (session?.user as any)?.role;
    const callbackUrl = searchParams.get("callbackUrl");

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      window.location.href = "/admin";
    } else if (role === "SUPPLIER") {
      window.location.href = "/supplier";
    } else {
      router.push((callbackUrl as any) ?? "/account");
    }
  }

  // Fixed composition — Admin controls WHICH product occupies each slot,
  // never these layout values. Center is dominant per the approved
  // reference (larger, taller, no rotation); left/right are smaller,
  // counter-rotated outward.
  const leftCard = showcase.left && { ...showcase.left, role: "side" as const, rotate: -6 };
  const centerCard = showcase.center && { ...showcase.center, role: "center" as const, rotate: 0 };
  const rightCard = showcase.right && { ...showcase.right, role: "side" as const, rotate: 6 };
  const cards = [leftCard, centerCard, rightCard].filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="savo-login-page">
      <div className="savo-login-panel">
        <div className="savo-login-panel-grid" />
        <div className="savo-login-panel-glow" />

        {cards.length > 0 && (
          <div className="savo-login-panel-tease">
            <div className="savo-login-panel-tease-glow" />
            {cards.map((card) => (
              <Link
                key={card.id}
                href={`/products/${card.slug}`}
                className={`savo-login-panel-card savo-login-panel-card--${card.role}`}
                style={{ "--savo-login-card-rotate": `${card.rotate}deg` } as React.CSSProperties}
              >
                <img src={card.image} alt={isArabic && card.nameAr ? card.nameAr : card.name} />
                <span className="savo-login-panel-card-info">
                  <span className="savo-login-panel-card-name">{isArabic && card.nameAr ? card.nameAr : card.name}</span>
                  <span className="savo-login-panel-card-price">{isArabic ? "د.ك " : "KD "}{card.price.toFixed(3)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="savo-login-panel-content">
          <span className="savo-login-panel-dot" />
          <h2 className="savo-login-panel-title">
            {isArabic ? <>عالمك<br />للاكتشاف<br /><span>ينتظرك.</span></> : <>Your world<br />of discovery<br /><span>awaits.</span></>}
          </h2>
          <p className="savo-login-panel-signature">عالمك للاكتشاف ينتظرك</p>
          <p className="savo-login-panel-sub">{isArabic ? "أكثر من 12,000 منتج. أكثر من 340 علامة تجارية. جديد كل يوم." : "12,000+ products. 340+ brands. Something new every single day."}</p>
        </div>
      </div>

      <div className="savo-login-form-side">
        <div className="savo-login-form-wrap">
          <h1 className="savo-login-title">{t("loginTitle")}</h1>
          <p className="savo-login-sub">{t("loginSubtitle")}</p>

          <form onSubmit={handleSubmit} className="savo-login-form">
            <div className="savo-login-field">
              <label>{t("email")}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="savo-login-input" />
            </div>
            <div className="savo-login-field">
              <label>{t("password")}</label>
              <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} className="savo-login-input" />
            </div>
            <button type="submit" disabled={loading} className="savo-login-submit">
              {loading ? t("signingIn") : t("signIn")}
            </button>

            <p className="savo-login-create">
              {t("newToSaveo")} <Link href="/register" className="savo-login-link">{t("createAccount")}</Link>
            </p>

            <div className="savo-login-supplier-wrap">
              <a href="/supplier/register" className="savo-login-supplier">
                <span className="savo-login-supplier-icon">🏭</span>
                <span className="savo-login-supplier-body">
                  <span className="savo-login-supplier-title">{isArabic ? "بوابة الموردين" : "Supplier portal"}</span>
                  <span className="savo-login-supplier-sub">{isArabic ? "سجّل كمورّد جديد" : "Apply as a Supplier"}</span>
                </span>
                <span className="savo-login-supplier-arrow">→</span>
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
