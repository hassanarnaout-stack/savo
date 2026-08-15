/**
 * AnnouncementTicker — Phase 2 Global Shell Migration.
 * ============================================================
 * A clean presentational integration point for a scrolling
 * announcement strip. No admin UI, no database model, no API route —
 * per the brief, this phase does not build a full admin feature.
 * `items` is a plain string array passed in by the caller; a future
 * phase can wire this to an admin-controlled source (e.g. a
 * SiteAnnouncement Prisma model) without changing this component's
 * contract.
 *
 * Uses the FINAL LOCKED Phase 1 brand tokens (savo-shell-* CSS
 * variables) — intentionally NOT the same `.v21-ticker` class the
 * existing Homepage Ticker() function uses (which is out of scope for
 * this phase and stays on the old teal value untouched).
 */
export interface AnnouncementTickerProps {
  items: string[];
}

export function AnnouncementTicker({ items }: AnnouncementTickerProps) {
  if (!items.length) return null;
  return (
    <div className="savo-shell-ticker" role="marquee" aria-label="Announcements">
      <div>
        {[...items, ...items].map((item, index) => (
          <span key={item + index}>{item}</span>
        ))}
      </div>
    </div>
  );
}
