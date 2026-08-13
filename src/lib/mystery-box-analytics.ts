/**
 * Mystery Box Analytics Events — Phase 4.2
 *
 * No dashboard/storage backend yet (per spec: not needed now). This is a
 * single, stable choke-point so every call site already fires the right
 * events with the right shape — swapping in a real analytics provider
 * (PostHog, Segment, GA4, a custom events table) later means changing
 * `dispatch()` in this one file, not hunting down every `trackEvent` call
 * across the app.
 */

export type MysteryBoxEventType =
  | "VIEWED_MYSTERY_BOX"
  | "ADDED_MYSTERY_BOX"
  | "PURCHASED_MYSTERY_BOX"
  | "REVEALED_MYSTERY_BOX";

export interface MysteryBoxEvent {
  type: MysteryBoxEventType;
  userId?: string | null;
  mysteryBoxProductId: string;
  data?: Record<string, unknown>;
  at: Date;
}

function dispatch(event: MysteryBoxEvent) {
  // Placeholder sink. Replace with a real analytics call when a provider
  // is chosen — every caller below stays unchanged.
  console.log(`[analytics:${event.type}]`, {
    userId: event.userId,
    mysteryBoxProductId: event.mysteryBoxProductId,
    data: event.data,
    at: event.at.toISOString(),
  });
}

export const MysteryBoxAnalytics = {
  viewed(mysteryBoxProductId: string, userId?: string | null) {
    dispatch({ type: "VIEWED_MYSTERY_BOX", mysteryBoxProductId, userId, at: new Date() });
  },
  added(mysteryBoxProductId: string, userId?: string | null, quantity = 1) {
    dispatch({ type: "ADDED_MYSTERY_BOX", mysteryBoxProductId, userId, data: { quantity }, at: new Date() });
  },
  purchased(mysteryBoxProductId: string, userId: string, orderItemId: string, quantity = 1) {
    dispatch({
      type: "PURCHASED_MYSTERY_BOX",
      mysteryBoxProductId,
      userId,
      data: { orderItemId, quantity },
      at: new Date(),
    });
  },
  revealed(mysteryBoxProductId: string, userId: string, revealId: string) {
    dispatch({ type: "REVEALED_MYSTERY_BOX", mysteryBoxProductId, userId, data: { revealId }, at: new Date() });
  },
};
