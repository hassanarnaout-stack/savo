"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Peek the rate-limit status before attempting sign-in so we can show
    // a clear, distinct message instead of NextAuth's generic
    // "invalid credentials" (which is the only outcome `authorize()` can
    // otherwise surface for a rate-limited attempt).
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
      // If the check itself fails, fall through to the normal sign-in
      // attempt rather than blocking login on a non-critical pre-check.
    }

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error(t("invalidCredentials"));
      return;
    }

    // Route by role. Admin and Supplier live outside the localized [locale]
    // segment (English-only by design), so we use a hard navigation there
    // instead of the locale-aware router to avoid an incorrect locale
    // prefix being added to those paths.
    const session = await getSession();
    const role = (session?.user as any)?.role;
    const callbackUrl = searchParams.get("callbackUrl");

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      window.location.href = "/admin";
    } else if (role === "SUPPLIER") {
      // /supplier itself checks verification status and routes onward to
      // /supplier/pending, /rejected, /suspended, or the dashboard.
      window.location.href = "/supplier";
    } else {
      router.push((callbackUrl as any) ?? "/account");
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-saveo-emerald-700/50">{t("loginSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">{t("email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">{t("password")}</label>
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t("signingIn") : t("signIn")}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-saveo-emerald-700/50">
        {t("newToSaveo")} <Link href="/register" className="font-semibold text-saveo-emerald-600">{t("createAccount")}</Link>
      </p>
      <p className="mt-2 text-center text-xs text-saveo-emerald-700/40">
        Are you a business? <a href="/supplier/register" className="font-semibold text-saveo-emerald-600">Apply as a Supplier</a>
      </p>
    </div>
  );
}
