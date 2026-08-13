import { getAnalyticsSessionId } from "@/lib/analytics-session";

type ClientTrackableEvent = "PAGE_VIEW" | "PRODUCT_VIEW" | "ADD_TO_CART" | "CHECKOUT_START";

/** Fire-and-forget client-side event tracking — never throws, never awaited by callers. */
export function trackClientEvent(type: ClientTrackableEvent, params?: { productId?: string; metadata?: Record<string, unknown> }) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId: getAnalyticsSessionId(), productId: params?.productId, metadata: params?.metadata }),
  }).catch(() => {});
}
