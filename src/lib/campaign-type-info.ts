/**
 * Real, honest documentation for every CampaignType — 16 total, but
 * only 5 have real logic + a customer-facing screen behind them today
 * (see isImplemented). The other 11 exist only as schema enum values
 * with empty seed config ({}) — reserved names for future campaigns,
 * not built experiences. Activating one of those shows the customer
 * nothing real, so this is surfaced explicitly in the admin UI rather
 * than letting an admin discover it the hard way.
 */
export interface CampaignTypeInfo {
  isImplemented: boolean;
  adminSummary: string;
  customerBenefit: string;
}

export const CAMPAIGN_TYPE_INFO: Record<string, CampaignTypeInfo> = {
  TREASURE_CHEST: {
    isImplemented: true,
    adminSummary: "Customer opens a chest on /treasure and wins one reward from a weighted pool you configure (discount, free delivery, points, credit, a free mystery box entry, or a Golden Ticket). Real odds computed live from the weights you set.",
    customerBenefit: "Open a free chest for an instant surprise reward — no purchase required.",
  },
  MYSTERY_SAFE: {
    isImplemented: true,
    adminSummary: "Same mechanic as Treasure Chest (weighted reward pool), on /mystery-safe. A separate campaign so you can run two different odds/reward sets at once.",
    customerBenefit: "Crack the safe for a random reward — could be a discount, free delivery, or more.",
  },
  GOLDEN_TICKET: {
    isImplemented: true,
    adminSummary: "Automatic draw on real order placement — 1-in-N orders wins (you set N), granting one fixed reward. Not a ticket the customer buys or picks; it's a real-time odds check that runs on every completed order.",
    customerBenefit: "Every order has a real chance of instantly winning a bonus reward.",
  },
  TREASURE_MAP: {
    isImplemented: true,
    adminSummary: "A real multi-stage task list (e.g. 'buy from category X') — each stage you configure grants its own reward when completed. Currently 2 real stages configured; add more anytime.",
    customerBenefit: "Complete simple shopping tasks to unlock a series of rewards, stage by stage.",
  },
  LIMITED_TIME_HUNT: {
    isImplemented: true,
    adminSummary: "A single specific product is the 'hunt target' for a limited time — the first N customers to buy it win a bonus reward. Real spots-remaining counter.",
    customerBenefit: "Be one of the first to grab a specific item and win an extra reward — first-come, first-served.",
  },
  SURPRISE_ENVELOPE: {
    isImplemented: true,
    adminSummary: "Same mechanic as Treasure Chest (weighted reward pool), on /surprise-envelope — a visually distinct envelope-themed daily open, independent config from the other daily-open campaigns.",
    customerBenefit: "Open a daily envelope for a random reward — a discount, free delivery, points, credit, or more.",
  },
  LUCKY_PRODUCT: { isImplemented: false, adminSummary: "Reserved name only — no logic, no config, no customer screen exists yet.", customerBenefit: "" },
  COLLECT_UNLOCK: {
    isImplemented: true,
    adminSummary: "Real progress tracking toward an admin-set target (default 5) — each real 'collect' action increments genuine server-tracked progress; reward unlocks once, re-verified server-side, not trusted from the client.",
    customerBenefit: "Collect stamps as you shop and unlock a real reward once you hit the target.",
  },
  PICK_THREE: {
    isImplemented: true,
    adminSummary: "Uses the same weighted reward pool as Treasure Chest, but reveals 3 real draws at once and grants the single best one — genuinely matches the 'pick three' name, all 3 decided server-side in one call.",
    customerBenefit: "Reveal three surprises at once — your best one becomes a real reward.",
  },
  DAILY_CRYSTAL: { isImplemented: false, adminSummary: "Reserved name only — no logic, no config, no customer screen exists yet.", customerBenefit: "" },
  BALLOON_POP: { isImplemented: false, adminSummary: "Reserved name only — no logic, no config, no customer screen exists yet.", customerBenefit: "" },
  MYSTERY_CARDS: { isImplemented: false, adminSummary: "Reserved name only — no logic, no config, no customer screen exists yet.", customerBenefit: "" },
  HIDDEN_CASHBACK: {
    isImplemented: true,
    adminSummary: "Real random KD amount (admin-set min/max range) credited directly to the customer's actual wallet via WalletService.credit() at reveal time — not a promo code or points, genuine spendable balance immediately.",
    customerBenefit: "Reveal a hidden cash amount, instantly added to your real wallet balance.",
  },
  COMMUNITY_GOAL: { isImplemented: false, adminSummary: "Reserved name only — no logic, no config, no customer screen exists yet.", customerBenefit: "" },
  MYSTERY_FRIDAY: { isImplemented: false, adminSummary: "Reserved name only — no logic, no config, no customer screen exists yet.", customerBenefit: "" },
  SECRET_VIP_DEAL: { isImplemented: false, adminSummary: "Reserved name only — no logic, no config, no customer screen exists yet.", customerBenefit: "" },
};
