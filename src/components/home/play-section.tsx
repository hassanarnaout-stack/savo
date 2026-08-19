"use client";

import { useRef, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";

/**
 * SAVO Play homepage card — dynamically represents whichever REAL
 * campaign is currently the top-priority ACTIVE game, exactly per
 * CampaignService.getActiveCampaigns() (status=ACTIVE, priority desc,
 * schedule-checked) — the SAME canonical source Admin's "Today's
 * Discovery" widget already uses (todays-discovery-widget.tsx).
 * ZERO hardcoded game identity: change the featured game entirely
 * from /admin/marketing/campaigns, zero code change needed.
 *
 * Visual experience depends on the real campaign.type — Treasure
 * Chest gets its own interactive chest visual, Mystery Safe gets its
 * interactive dial, any other real active campaign type gets a clean
 * generic presentation (reusing the same icon/path mapping as
 * todays-discovery-widget.tsx) rather than inventing new mechanics
 * for it.
 *
 * CRITICAL: every visual here is presentation only. Reward/odds/
 * eligibility/daily-limits/win-result are 100% server-authoritative —
 * this card NEVER computes a winner. Every CTA is a real link into
 * the canonical entry point for that campaign type (e.g. /treasure,
 * /mystery-safe) where the actual server-authoritative play happens.
 */
export interface FeaturedGame {
  id: string;
  type: string;
  name: string;
  nameAr?: string | null;
}

interface MysterySafeStatus {
  available: boolean;
  hasKey: boolean;
  alreadyOpenedToday: boolean;
}

const GAME_PATH: Record<string, string> = {
  TREASURE_CHEST: "/treasure",
  MYSTERY_SAFE: "/mystery-safe",
  GOLDEN_TICKET: "/golden-ticket",
  TREASURE_MAP: "/treasure-map",
  LIMITED_TIME_HUNT: "/hunt",
  SURPRISE_ENVELOPE: "/surprise-envelope",
  PICK_THREE: "/pick-three",
  COLLECT_UNLOCK: "/collect-unlock",
  HIDDEN_CASHBACK: "/hidden-cashback",
};

function MysterySafeDial() {
  const dialRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(45);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const angleFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const a = angleFromPointer(e.clientX, e.clientY);
    if (a !== null) setAngle(a);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const a = angleFromPointer(e.clientX, e.clientY);
    if (a !== null) setAngle(a);
  }
  function handlePointerUp() {
    draggingRef.current = false;
    setDragging(false);
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") setAngle((a) => a + 15);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") setAngle((a) => a - 15);
  }

  const rad = (angle * Math.PI) / 180;
  const needleX = 60 + Math.cos(rad) * 26;
  const needleY = 60 + Math.sin(rad) * 26;

  return (
    <div
      ref={dialRef}
      className={`savo-play-dial${dragging ? " is-dragging" : ""}`}
      role="slider" tabIndex={0} aria-label="Mystery Safe dial"
      aria-valuenow={Math.round(angle)} aria-valuemin={-180} aria-valuemax={180}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onKeyDown={handleKeyDown}
    >
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0,229,160,0.18)" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--savo-shell-discovery)" strokeWidth="2" strokeDasharray="6 10" strokeLinecap="round" opacity="0.55" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x1 = 60 + Math.cos(a) * 46, y1 = 60 + Math.sin(a) * 46;
          const x2 = 60 + Math.cos(a) * 40, y2 = 60 + Math.sin(a) * 40;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />;
        })}
        <line x1="60" y1="60" x2={needleX} y2={needleY} stroke="var(--savo-shell-discovery)" strokeWidth="2.5" strokeLinecap="round" style={{ transition: dragging ? "none" : "all .35s cubic-bezier(.2,.9,.3,1.3)" }} />
        <circle cx="60" cy="60" r="4" fill="var(--savo-shell-discovery)" />
      </svg>
    </div>
  );
}

function TreasureChestVisual() {
  const [hover, setHover] = useState(false);
  return (
    <div className={`savo-play-chest${hover ? " is-hover" : ""}`} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <svg viewBox="0 0 120 100" width="100%" height="100%">
        <ellipse cx="60" cy="88" rx="42" ry="6" fill="rgba(232,160,32,0.12)" />
        <rect x="16" y="46" width="88" height="42" rx="8" fill="#1a1200" stroke="rgba(232,160,32,0.4)" strokeWidth="2" />
        <rect x="16" y="60" width="88" height="4" fill="rgba(232,160,32,0.25)" />
        <rect x="52" y="46" width="16" height="42" fill="rgba(232,160,32,0.18)" />
        <g style={{ transformOrigin: "60px 46px", transform: hover ? "rotate(-18deg)" : "rotate(-4deg)", transition: "transform .4s cubic-bezier(.2,.9,.3,1.3)" }}>
          <path d="M16 46 Q16 18 60 18 Q104 18 104 46 Z" fill="#2a1e00" stroke="rgba(232,160,32,0.4)" strokeWidth="2" />
        </g>
        <circle cx="60" cy="52" r="6" fill="var(--savo-shell-gold)" opacity={hover ? 1 : 0.7} style={{ transition: "opacity .3s" }} />
        {hover && Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return <circle key={i} cx={60 + Math.cos(a) * 30} cy={30 + Math.sin(a) * 14} r="1.6" fill="var(--savo-shell-gold)" opacity="0.8" />;
        })}
      </svg>
    </div>
  );
}

function GenericGameVisual() {
  return (
    <div className="savo-play-generic" aria-hidden="true">
      <span>✨</span>
    </div>
  );
}

export function PlaySection({
  featuredGame, mysterySafeStatus, isSignedIn, locale,
}: {
  featuredGame: FeaturedGame | null;
  mysterySafeStatus: MysterySafeStatus | null;
  isSignedIn: boolean;
  locale: string;
}) {
  const isArabic = locale === "ar";

  if (!featuredGame) {
    return (
      <div className="savo-play-card">
        <p className="savo-products-eyebrow">{isArabic ? "سافو بلاي" : "SAVO PLAY"}</p>
        <span className="savo-play-badge">{isArabic ? "لعبة مميزة" : "Featured Game"}</span>
        <div className="savo-play-generic" aria-hidden="true"><span>✨</span></div>
        <p className="savo-play-state">{isArabic ? "اللعبة غير متاحة حاليًا — ترقّبوا قريبًا" : "Not available right now — check back soon"}</p>
      </div>
    );
  }

  const path = GAME_PATH[featuredGame.type] ?? "/";
  const gameName = isArabic && featuredGame.nameAr ? featuredGame.nameAr : featuredGame.name;

  const stateLabel = featuredGame.type === "MYSTERY_SAFE" && mysterySafeStatus
    ? !isSignedIn
      ? isArabic ? "سجّل دخولك لكسب مفتاحك اليومي" : "Sign in to earn your daily key"
      : mysterySafeStatus.alreadyOpenedToday
      ? isArabic ? "رجع لك بكرة لمحاولة جديدة" : "Come back tomorrow for another try"
      : mysterySafeStatus.hasKey
      ? isArabic ? "مفتاحك جاهز — العب الآن" : "Your key is ready — play now"
      : isArabic ? "اكسب مفتاح بتسجيل الدخول أو الشراء" : "Earn a key by logging in or purchasing"
    : isArabic ? "متاح الآن — العب" : "Available now — play";

  const tagline = featuredGame.type === "TREASURE_CHEST"
    ? isArabic ? "افتح الصندوق. مكافأة حقيقية بانتظارك بالداخل." : "Open the chest. A real reward is waiting inside."
    : featuredGame.type === "MYSTERY_SAFE"
    ? isArabic ? "أدر القرص. خلف كل توليفة، شي حقيقي بانتظارك." : "Turn the dial. Behind every combination, something real is waiting."
    : isArabic ? "شارك اليوم واكتشف مكافأتك." : "Play today and discover your reward.";

  return (
    <div className="savo-play-card">
      <p className="savo-products-eyebrow">{isArabic ? "سافو بلاي" : "SAVO PLAY"}</p>
      <span className="savo-play-badge">{isArabic ? "لعبة مميزة" : "Featured Game"}</span>

      {featuredGame.type === "TREASURE_CHEST" ? <TreasureChestVisual /> : featuredGame.type === "MYSTERY_SAFE" ? <MysterySafeDial /> : <GenericGameVisual />}

      <p className="savo-play-name">{gameName}</p>
      <p className="savo-play-tagline">{tagline}</p>
      <p className="savo-play-state">{stateLabel}</p>
      {/* Real link into the canonical entry point for this campaign
         type — the actual server-authoritative play/reward happens
         there, never on this homepage card. */}
      <Link href={path} className="savo-play-cta">{isArabic ? "العب الآن ←" : "Play Now →"}</Link>
      <Link href={path} className="savo-play-explore">{isArabic ? "استكشف سافو بلاي ←" : "Explore SAVO Play →"}</Link>
    </div>
  );
}
