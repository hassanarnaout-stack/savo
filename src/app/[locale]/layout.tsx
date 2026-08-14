import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getDirection } from "@/i18n/request";
import "../globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartHydration } from "@/components/cart/cart-hydration";
import { Toaster } from "sonner";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { AIConciergeLauncher } from "@/components/ai-assistant/ai-concierge-launcher";
import { AffiliateTracker } from "@/components/affiliate/affiliate-tracker";
import { BrowserExtensionErrorGuard } from "@/components/layout/browser-extension-error-guard";
import { getLaunchFlags } from "@/lib/launch-flags";
import { MobileBottomNavigation } from "@/components/layout/storefront-navigation";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brand");
  const title = `Savo — ${t("tagline")}`;
  const description =
    "Savo is Kuwait's smart savings marketplace connecting customers with discounted products from verified suppliers.";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: title, template: "%s — Savo" },
    description,
    openGraph: {
      title,
      description,
      siteName: "Savo",
      type: "website",
      locale: "en_US",
      alternateLocale: "ar_KW",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const FEATURE_FLAGS = await getLaunchFlags().catch(() => ({
    SAVE_AI_ENABLED: false,
    ADVANCED_RECOMMENDATIONS_ENABLED: false,
    MYSTERY_BOX_ENABLED: false,
    SAVEO_PLUS_ENABLED: false,
    GAMIFICATION_ENABLED: false,
    ADVANCED_DEAL_OF_HOUR_ENABLED: false,
    SMART_CROSS_SELLING_ENABLED: false,
  }));

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  // Enables static rendering for this locale's subtree
  setRequestLocale(locale);

  const dir = getDirection(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir}>
      <body className={dir === "rtl" ? "font-arabic" : "font-sans"}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CartHydration />
          <div className="store-shell">
            <Header />
            <div className="store-scroll">
              <main>{children}</main>
              <Footer />
            </div>
            <MobileBottomNavigation locale={locale} />
          </div>
          <CartDrawer />
          <FeedbackWidget />
          {FEATURE_FLAGS.SAVE_AI_ENABLED && <AIConciergeLauncher locale={locale} />}
          <Suspense fallback={null}>
            <AffiliateTracker />
          </Suspense>
          <BrowserExtensionErrorGuard />
          <PageViewTracker />
          <Toaster position="top-center" richColors dir={dir} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
