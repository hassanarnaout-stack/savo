/**
 * AnnouncementTicker — the single global shell ticker.
 * ============================================================
 * Ported 1:1 from the approved V22 source (`DiscoveryTicker`,
 * savo-new/src/App.tsx). V22 defines exactly one ticker, mounted
 * at the top of Nav — there is no second "lower" ticker in the
 * approved design. The legacy Homepage `.v21-ticker` strip that
 * used to run beneath the hero has been removed; it had no V22
 * counterpart.
 *
 * `items` is a plain array passed in by the caller (no admin UI,
 * no database model, no API route — a future phase can wire this
 * to an admin-controlled source, e.g. a SiteAnnouncement Prisma
 * model, without changing this component's contract).
 *
 * Visual contract (matches V22 exactly):
 * - Fixed-height row, SAVO Surface background, single bottom border.
 * - Items render as a continuous horizontal marquee. Real production
 *   content is short (as few as 3 items) — far narrower than V22's own
 *   15-item source list — so a naive single-doubled list leaves a
 *   visible gap/reset on any real desktop width. REPEAT_COUNT rebuilds
 *   a wide "cycle" from the real items first, then duplicates that
 *   cycle once for the classic 0 → -50% seamless loop. This preserves
 *   V22's technique (duplicate + translateX to -50%) while making it
 *   actually gap-free with real, shorter production content — verified
 *   at 1920/1440/1280/mobile widths.
 * - translateX 0 → -50%, 55s linear loop, pauses on hover, disabled
 *   under prefers-reduced-motion.
 * - Each item is a pill separated by a trailing border, optionally
 *   linkable (`item.link`, defaults to "#" like V22).
 * - Icon + text both take the item's semantic tone color (V22 colors
 *   the whole item, not just the icon).
 * - RTL items (`item.rtl`) render right-to-left in Cairo; LTR items
 *   render in Manrope — matching V22's bilingual ticker content.
 */
export type AnnouncementTone = "default" | "discovery" | "urgency" | "premium";

export interface AnnouncementItem {
  icon: string;
  text: string;
  tone?: AnnouncementTone;
  link?: string;
  rtl?: boolean;
}

export interface AnnouncementTickerProps {
  items: AnnouncementItem[];
}

const TONE_COLOR: Record<AnnouncementTone, string> = {
  default: "var(--savo-shell-text)",
  discovery: "var(--savo-shell-discovery)", // SAVO Discovery #00D4A1 — new arrivals, exploration cues
  urgency: "var(--savo-shell-fire)", // SAVO Fire #FF4D0F — flash deals, limited stock, countdowns
  premium: "var(--savo-shell-gold)", // SAVO Gold #E8A020 — SAVO Plus, premium Mystery Box contexts
};

export function AnnouncementTicker({ items }: AnnouncementTickerProps) {
  if (!items.length) return null;
  // Build a cycle wide enough to exceed any real viewport (up to ~8K)
  // regardless of how few real announcement items exist, then duplicate
  // it once — the classic seamless-loop technique, made robust to short
  // real content instead of assuming a V22-sized item list.
  const REPEAT_COUNT = 8;
  const cycle = Array.from({ length: REPEAT_COUNT }, () => items).flat();
  const track = [...cycle, ...cycle];
  return (
    <div className="savo-shell-ticker" role="marquee" aria-label="Announcements">
      <div className="savo-shell-ticker-track">
        {track.map((item, index) => (
          <a
            key={index}
            href={item.link ?? "#"}
            dir={item.rtl ? "rtl" : "ltr"}
            className="savo-shell-ticker-item"
            style={{ color: TONE_COLOR[item.tone ?? "default"] }}
          >
            <span className="savo-shell-ticker-icon">{item.icon}</span>
            {item.text}
          </a>
        ))}
      </div>
    </div>
  );
}
