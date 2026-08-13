/**
 * ACTION EXECUTOR
 * ============================================================
 * CRITICAL SAFETY BOUNDARY: this file does NOT call the real
 * cart store, checkout API, or any mutation endpoint. Mutating
 * actions (ADD_TO_CART, APPLY_COUPON, etc.) are only ever
 * RESOLVED to a validated payload — the actual mutation still
 * goes through the existing, unmodified cart store / checkout
 * API. This function intentionally cannot mutate anything itself.
 * ============================================================
 */
import { StructuredAction } from "./types";

export interface ResolvedAction {
  action: StructuredAction;
  navigateTo: string | null;
  readyForCommerceLayer: boolean;
}

export function resolveAction(action: StructuredAction): ResolvedAction {
  switch (action.type) {
    case "VIEW_PRODUCT":
      return { action, navigateTo: action.productId ? `/products/${action.productId}` : null, readyForCommerceLayer: false };
    case "VIEW_BRAND":
      return { action, navigateTo: action.brandName ? `/brands/${encodeURIComponent(action.brandName)}` : null, readyForCommerceLayer: false };
    case "VIEW_CATEGORY":
      return { action, navigateTo: action.categoryId ? `/category/${action.categoryId}` : null, readyForCommerceLayer: false };
    case "VIEW_DEAL":
      return { action, navigateTo: "/discover", readyForCommerceLayer: false };
    case "VIEW_ORDER":
      return { action, navigateTo: action.orderId ? `/account/orders/${action.orderId}` : null, readyForCommerceLayer: false };
    case "START_CHECKOUT":
      return { action, navigateTo: "/checkout", readyForCommerceLayer: false };
    case "JOIN_SAVEO_PLUS":
      return { action, navigateTo: "/account", readyForCommerceLayer: false };

    case "ADD_TO_CART":
    case "REMOVE_FROM_CART":
    case "UPDATE_QUANTITY":
    case "APPLY_COUPON":
    case "SUBSCRIBE_PRODUCT":
      return { action, navigateTo: null, readyForCommerceLayer: !!action.productId || !!action.couponCode };

    default:
      return { action, navigateTo: null, readyForCommerceLayer: false };
  }
}
