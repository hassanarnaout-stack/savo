"use client";

/**
 * SAVOHour — Phase 3 V22 Homepage Migration.
 * ============================================================
 * Presentation ported from the approved V22 source
 * (savo-new/src/App.tsx, SAVOHour()). Backed by the real
 * DealOfTheHour model (see homepage-view-model.ts) — this section
 * existed on an earlier Homepage iteration and was disconnected
 * during the V21 migration; this reconnects it rather than
 * building a second countdown/urgency engine.
 *
 * Real data only:
 * - price/discount: from the product + optional admin discountOverride
 * - "claimed" progress + buyers count: DealOfTheHour.buyersCount, a
 *   real incrementing counter (not fabricated social proof)
 * - "X left": stockLimit - buyersCount
 * - countdown: shared HomeCountdown (same engine as Flash Deals)
 *
 * Renders nothing if there's no active slot (ADVANCED_DEAL_OF_HOUR_ENABLED
 * off, or no admin-configured slot currently running) — no placeholder,
 * no mock product, per the "no mock data in production" rule.
 *
 * Intentional adaptation from V22: V22's CTA column ends with a
 * "Free delivery · Free returns" caption. Production's only verified
 * free-delivery policy is scoped ("Free delivery on SAVO Plus orders",
 * see header.tsx SHELL_ANNOUNCEMENTS) — not a universal guarantee for
 * every deal. Displaying it unscoped here would be an unsupported
 * commercial claim, so it's omitted rather than copied verbatim.
 * "Save for later" is real (wired to /api/favorites), not decorative.
 */
import Image from "next/image";
import { useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { HomeDealOfHour } from "@/lib/homepage-view-model";
import { HomeCountdown } from "./v21-home-client";

const kd = (value: number) => "KD " + value.toFixed(3);

export function SavoHour({ deal }: { deal: HomeDealOfHour | null }) {
  if (!deal) return null;
  const remaining = Math.max(0, deal.stockLimit - deal.buyersCount);
  const claimedPct = deal.stockLimit > 0 ? Math.min(100, Math.round((deal.buyersCount / deal.stockLimit) * 100)) : 0;

  return (
    <section className="savo-hour">
      <div className="savo-hour-band">
        <div className="savo-hour-live">
          <i />
          <span>SAVO HOUR · LIVE</span>
        </div>
        <div className="savo-hour-timer">
          <small>Ends in</small>
          <HomeCountdown endsAt={deal.endsAt} segmented />
        </div>
        <span className="savo-hour-chip">Limited Time</span>
      </div>

      <div className="savo-hour-stage">
        <Link href={'/products/' + deal.slug} className="savo-hour-image">
          {deal.image ? (
            <Image src={deal.image} alt={deal.name} fill sizes="(max-width: 900px) 100vw, 220px" />
          ) : (
            <span className="v21-image-unavailable">Source image unavailable</span>
          )}
          {deal.discountPercent > 0 && <b>-{deal.discountPercent}%</b>}
        </Link>

        <div className="savo-hour-details">
          {deal.supplierName && <small>{deal.supplierName}</small>}
          <h3>
            <Link href={'/products/' + deal.slug}>{deal.name}</Link>
          </h3>
          {deal.nameAr && <p dir="rtl">{deal.nameAr}</p>}

          <div className="savo-hour-price">
            <strong>{kd(deal.price)}</strong>
            {deal.originalPrice > deal.price && <del>{kd(deal.originalPrice)}</del>}
          </div>

          {deal.stockLimit > 0 && (
            <div className="savo-hour-progress">
              <div>
                <span>Claimed</span>
                <span>{claimedPct}%</span>
              </div>
              <i>
                <b style={{ width: claimedPct + "%" }} />
              </i>
            </div>
          )}

          <div className="savo-hour-meta">
            {remaining > 0 && <span className="savo-hour-stock">Only {remaining} left</span>}
            {deal.buyersCount > 0 && <span className="savo-hour-buyers">{deal.buyersCount} bought today</span>}
          </div>
        </div>

        <div className="savo-hour-cta">
          <Link href={'/products/' + deal.slug} className="savo-hour-buy">
            Grab Deal →
          </Link>
          <SaveForLater productId={deal.productId} initialFavorited={deal.isFavorited} />
        </div>
      </div>
    </section>
  );
}

/**
 * Secondary CTA — V22's SAVOHour has a "Save for later" action beside
 * the primary buy button. Wired to the real, existing /api/favorites
 * route (same optimistic toggle pattern as product-card.tsx's heart
 * button) rather than a decorative no-op button.
 */
function SaveForLater({ productId, initialFavorited }: { productId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const optimistic = !favorited;
    setFavorited(optimistic);
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        setFavorited(!optimistic);
        return;
      }
      const data = await res.json();
      setFavorited(data.favorited);
    } catch {
      setFavorited(!optimistic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} className={favorited ? "savo-hour-save is-saved" : "savo-hour-save"}>
      <Heart size={15} fill={favorited ? "currentColor" : "none"} /> {favorited ? "Saved" : "Save for later"}
    </button>
  );
}
