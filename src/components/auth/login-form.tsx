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
}

/**
 * SAVO Login — exact V22 visual transplant (LoginPage, V22
 * CustomerPages.tsx): left decorative identity panel (44% desktop
 * width) with the exact V22 dot-grid + radial glow + 3-card product
 * tease at fixed V22 positions/rotation/opacity/lift — now showing
 * REAL, Admin-selected catalog products (Login Showcase Products,
 * /admin/login-showcase) instead of any placeholder imagery. A
 * missing slot (unconfigured / product became unavailable) simply
 * doesn't render its card — never a broken image. Approved SAVO copy
 * preserved (not V22's wording) for both the panel and the form side.
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

  // Fixed V22 positions — Admin controls WHICH product, never these values.
  const cards = [
    showcase.left && { ...showcase.left, rotate: -5, lift: 0, opacity: 0.6 },
    showcase.center && { ...showcase.center, rotate: 0, lift: -12, opacity: 1 },
    showcase.right && { ...showcase.right, rotate: 5, lift: 0, opacity: 0.6 },
  ].filter((c): c is ShowcaseProduct & { rotate: number; lift: number; opacity: number } => !!c);

  return (
    <div className="savo-login-page">
      <div className="savo-login-panel">
        <div className="savo-login-panel-grid" />
        <div className="savo-login-panel-glow" />

        {cards.length > 0 && (
          <div className="savo-login-panel-tease">
            {cards.map((card) => (
              <div key={card.id} className="savo-login-panel-card" style={{ transform: `rotate(${card.rotate}deg) translateY(${card.lift}px)`, opacity: card.opacity }}>
                <img src={card.image} alt={isArabic && card.nameAr ? card.nameAr : card.name} />
              </div>
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
