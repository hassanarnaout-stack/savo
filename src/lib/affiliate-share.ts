import { routing } from "@/i18n/routing";

/**
 * SAVO Discovery Partners V2 — Phase 1, Step 1 (Product-Level Share & Earn).
 *
 * Canonical, typed helper for building an affiliate share URL. Reuses the
 * EXACT existing attribution mechanism — the same `?ref=CODE` query param
 * already read by `AffiliateTracker` and turned into the same `savo_ref`
 * cookie by `/api/affiliate/track-click`. This is NOT a second
 * attribution system: it's the existing one, pointed at a real product
 * landing page instead of the homepage.
 *
 * Also fixes the locale bug the Phase 1 audit found (the dashboard's
 * referral link was hardcoded to `/en?ref=...`) — every caller now must
 * pass a real locale, so the generated link always lands on the correct
 * language version of the page.
 */
export function buildAffiliateShareUrl(params: {
  origin: string;
  locale: string;
  referralCode: string;
  /** Real product slug for a product-specific share link. Omit to build a
   * generic homepage share link (same shape the dashboard already used,
   * just locale-correct now). */
  productSlug?: string;
}): string {
  const locale = (routing.locales as readonly string[]).includes(params.locale) ? params.locale : routing.defaultLocale;
  const path = params.productSlug ? `/products/${encodeURIComponent(params.productSlug)}` : "";
  const url = new URL(`/${locale}${path}`, params.origin);
  url.searchParams.set("ref", params.referralCode);
  return url.toString();
}
