/**
 * PlusMerchandisingService — SAVO Plus Drop (Phase: additive, approved).
 * Single source of truth for the effective price and access rule of a
 * product under the three Plus merchandising modes. Used by BOTH the
 * customer Plus Drop display AND checkout server-side enforcement —
 * one function, zero duplicated logic between "what we show" and
 * "what we actually charge/allow".
 */

interface PlusEligibleProduct {
  isMembersOnly: boolean;
  plusPrice: number | null;
  earlyAccessStartsAt: Date | null;
  publicAccessStartsAt: Date | null;
  saveoPrice: number;
}

export type PlusBadge = "MEMBERS_ONLY" | "EARLY_ACCESS" | "PLUS_PRICE" | null;

/** True only inside a genuine, fully-configured Early Access window (both dates set, public later than early). */
function isInEarlyAccessWindow(p: PlusEligibleProduct, now: Date): boolean {
  if (!p.earlyAccessStartsAt) return false; // no early access date at all — never treat as Early Access
  if (p.publicAccessStartsAt && p.publicAccessStartsAt <= p.earlyAccessStartsAt) return false; // invalid config — fail safe, treat as not Early Access
  const startedForPlus = now >= p.earlyAccessStartsAt;
  const stillPlusOnly = !p.publicAccessStartsAt || now < p.publicAccessStartsAt;
  return startedForPlus && stillPlusOnly;
}

/** Badge priority for DISPLAY only: MEMBERS_ONLY > EARLY_ACCESS > PLUS_PRICE. All underlying rules stay independently enforced regardless of which badge is shown. */
export function classifyPlusBadge(p: PlusEligibleProduct, now: Date = new Date()): PlusBadge {
  if (p.isMembersOnly) return "MEMBERS_ONLY";
  if (isInEarlyAccessWindow(p, now)) return "EARLY_ACCESS";
  if (p.plusPrice != null) return "PLUS_PRICE";
  return null;
}

/**
 * The price a customer actually pays right now. Active Plus members get
 * plusPrice when configured; everyone else always gets the normal
 * saveoPrice — never inferred from anything client-supplied.
 */
export function getEffectivePrice(p: PlusEligibleProduct, isActiveMember: boolean, now: Date = new Date()): number {
  if (isActiveMember && p.plusPrice != null) return p.plusPrice;
  return p.saveoPrice;
}

/**
 * Whether a customer may access/purchase this product THROUGH the Plus
 * merchandising rules right now. Does not replace normal stock/status
 * checks — this is purely the Plus-specific gate.
 */
export function canAccessPlusProduct(p: PlusEligibleProduct, isActiveMember: boolean, now: Date = new Date()): boolean {
  if (p.isMembersOnly) return isActiveMember; // strongest rule — never overridden by publicAccessStartsAt
  if (p.earlyAccessStartsAt && isInEarlyAccessWindow(p, now)) return isActiveMember; // inside the Plus-only window
  return true; // no Plus-specific restriction applies
}
