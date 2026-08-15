/**
 * AnnouncementTicker — Phase 2 Global Shell Migration.
 * ============================================================
 * A clean presentational integration point for a scrolling
 * announcement strip. No admin UI, no database model, no API route —
 * per the brief, this phase does not build a full admin feature.
 * `items` is a plain array passed in by the caller; a future phase
 * can wire this to an admin-controlled source (e.g. a
 * SiteAnnouncement Prisma model) without changing this component's
 * contract.
 *
 * Uses the FINAL LOCKED Phase 1 brand tokens (savo-shell-* CSS
 * variables) — intentionally NOT the same `.v21-ticker` class the
 * existing Homepage Ticker() function uses (a separate, out-of-scope
 * component with its own selector).
 *
 * Content color: each item's leading `icon` gets a semantic accent
 * color per its `tone` (Brand Kit rule — accent on icon/keyword only,
 * never the whole message). The message `text` itself always stays
 * on the neutral SAVO Text color for readability. Background, height,
 * layout, and the scrolling/rotation behavior are untouched.
 */
export type AnnouncementTone = "default" | "discovery" | "urgency" | "premium";

export interface AnnouncementItem {
  icon: string;
  text: string;
  tone?: AnnouncementTone;
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
  return (
    <div className="savo-shell-ticker" role="marquee" aria-label="Announcements">
      <div>
        {[...items, ...items].map((item, index) => (
          <span key={item.text + index}>
            <b style={{ color: TONE_COLOR[item.tone ?? "default"] }}>{item.icon}</b> {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
