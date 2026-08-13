/**
 * ============================================================
 * SAVEO AI SHOPPING ASSISTANT — Shared Types
 * ============================================================
 * ADDITIVE ONLY. ZERO SCHEMA CHANGES.
 *
 * CRITICAL SAFETY CONTRACT:
 * - The assistant NEVER calls Prisma directly — every fact comes
 *   from Phase 4's buildContext().
 * - The assistant NEVER executes a cart/order/coupon mutation
 *   directly. It emits a StructuredAction; the real Commerce Layer
 *   is what actually performs it, after user confirmation.
 * - Every AIReason and every product/price shown MUST trace back
 *   to a real field already present in the context object.
 * ============================================================
 */
import { SaveoAIContext } from "@/lib/ai-context";

export type ActionType =
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "UPDATE_QUANTITY"
  | "VIEW_PRODUCT"
  | "VIEW_BRAND"
  | "VIEW_CATEGORY"
  | "APPLY_COUPON"
  | "VIEW_DEAL"
  | "START_CHECKOUT"
  | "VIEW_ORDER"
  | "SUBSCRIBE_PRODUCT"
  | "JOIN_SAVEO_PLUS";

const CONFIRMATION_REQUIRED: ReadonlySet<ActionType> = new Set([
  "ADD_TO_CART", "REMOVE_FROM_CART", "UPDATE_QUANTITY", "APPLY_COUPON", "START_CHECKOUT", "SUBSCRIBE_PRODUCT", "JOIN_SAVEO_PLUS",
]);

export function requiresConfirmation(type: ActionType): boolean {
  return CONFIRMATION_REQUIRED.has(type);
}

export interface StructuredAction {
  type: ActionType;
  productId?: string;
  brandName?: string;
  categoryId?: string;
  couponCode?: string;
  orderId?: string;
  quantity?: number;
  requiresConfirmation: boolean;
  confirmationText: string | null;
}

export interface AIProductCard {
  productId: string;
  productName: string;
  slug: string;
  brand: string | null;
  price: number;
  originalPrice: number | null;
  image: string | null;
  stockQty: number;
  rating: number | null;
  available: boolean;
  savings: number | null;
  aiReason: string;
  actions: StructuredAction[];
}

export interface AIComparisonCard {
  products: {
    productId: string;
    productName: string;
    price: number;
    rating: number | null;
    demandScore: number | null;
  }[];
  bestValue: string | null;
  bestRated: string | null;
  bestPrice: string | null;
  aiRecommendation: string;
}

export interface BudgetBasket {
  budget: number;
  items: AIProductCard[];
  subtotal: number;
  remainingBudget: number;
}

export interface ConversationMemory {
  sessionId: string;
  budget: number | null;
  category: string | null;
  brand: string | null;
  productsDiscussed: string[];
  currentIntent: string;
  lastUpdated: number;
}

export interface AIAssistantResponse {
  message: string;
  productCards: AIProductCard[];
  comparisonCard: AIComparisonCard | null;
  budgetBasket: BudgetBasket | null;
  suggestedActions: StructuredAction[];
  suggestedPrompts: string[];
  context: SaveoAIContext;
  flaggedInput: boolean;
}
