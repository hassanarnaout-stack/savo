/**
 * Treasure Hunt Engine — Future Hook (Phase 4.1)
 *
 * Not implemented yet. This interface exists so product/marketing can
 * design the mechanic (daily hidden deal, scavenger-hunt-style discovery,
 * gamified unlocks, etc.) and engineering has a stable contract to build
 * against, without the homepage needing to change once it ships.
 *
 * Suggested shape once designed: a daily/weekly "hunt" made of one or more
 * TreasureHuntStep objects, each unlocking after some user action
 * (view N products, visit a category, etc.), ending in a reward (discount
 * code, mystery box, badge).
 */

export interface TreasureHuntStep {
  id: string;
  description: string;
  completed: boolean;
}

export interface TreasureHuntResult {
  id: string;
  title: string;
  steps: TreasureHuntStep[];
  rewardDescription: string;
  expiresAt: Date;
}

export interface TreasureHuntEngine {
  getTodaysHunt(userId?: string | null): Promise<TreasureHuntResult | null>;
}

/** No-op until the mechanic is designed and built. Never throws — callers
 * treat `null` as "nothing to show" and simply omit the section. */
class NotImplementedTreasureHuntEngine implements TreasureHuntEngine {
  async getTodaysHunt(): Promise<TreasureHuntResult | null> {
    return null;
  }
}

export const treasureHuntEngine: TreasureHuntEngine = new NotImplementedTreasureHuntEngine();
