/**
 * ASSISTANT SERVICE
 * ============================================================
 * The single public entry point. Ties together buildContext()
 * [Phase 4] → composeResponse() → memory update → real analytics
 * tracking. No LLM call anywhere in this chain.
 * ============================================================
 */
import { buildContext } from "@/lib/ai-context";
import { TemplateProvider } from "./providers/template-provider";
import { LLMProvider } from "./providers/llm-provider";
import { isLLMProviderConfigured } from "./providers/ai-provider";
import { getMemory, updateMemory } from "./conversation-memory";
import { trackAIEvent } from "./ai-analytics";
import { AIAssistantResponse } from "./types";

function getActiveProvider() {
  return isLLMProviderConfigured() ? new LLMProvider() : new TemplateProvider();
}

export interface AskAssistantParams {
  query: string;
  sessionId: string;
  requestingUserId: string | null;
  productId?: string;
  brandName?: string;
  categoryId?: string;
  compareProductIds?: string[];
}

export async function askAssistant(params: AskAssistantParams): Promise<AIAssistantResponse> {
  const memory = getMemory(params.sessionId);

  try {
    const context = await buildContext({
      query: params.query,
      requestingUserId: params.requestingUserId,
      productId: params.productId,
      brandName: params.brandName,
      categoryId: params.categoryId,
    });

    const provider = getActiveProvider();
    const { response } = await provider.generate({ context, compareProductIds: params.compareProductIds, requestingUserId: params.requestingUserId });

    updateMemory(params.sessionId, {
      budget: context.intent.budget ?? memory.budget,
      category: context.intent.category ?? memory.category,
      brand: context.intent.brand ?? memory.brand,
      productsDiscussed: response.productCards.map((p) => p.productId),
      currentIntent: context.intent.intent,
    });

    await trackAIEvent({
      event: "AI_QUERY",
      sessionId: params.sessionId,
      userId: params.requestingUserId,
      extra: { intent: context.intent.intent, rawQuery: params.query },
    });

    if (response.productCards.length > 0 || response.budgetBasket) {
      const shownProducts = response.productCards.length > 0 ? response.productCards : response.budgetBasket?.items ?? [];
      await Promise.all(
        shownProducts.map((p) => trackAIEvent({ event: "AI_RECOMMENDATION", sessionId: params.sessionId, userId: params.requestingUserId, productId: p.productId }))
      );
    }

    return response;
  } catch {
    return {
      message: "I'm having trouble right now — try browsing by category or search instead, or ask me again in a moment.",
      productCards: [],
      comparisonCard: null,
      budgetBasket: null,
      suggestedActions: [],
      suggestedPrompts: ["أفضل العروض الآن", "ساعدني أختار هدية 🎁"],
      context: {
        metadata: { contextVersion: "1.0.0", generatedAt: new Date().toISOString(), dataFreshness: [], sources: [] },
        intent: { intent: "UNKNOWN", category: null, budget: null, brand: null, isGift: false, wantsDiscount: false, wantsMembersOnly: false, dietTags: [], rawQuery: params.query },
      },
      flaggedInput: false,
    };
  }
}

export async function startAssistantSession(sessionId: string, requestingUserId: string | null): Promise<void> {
  await trackAIEvent({ event: "AI_SESSION_STARTED", sessionId, userId: requestingUserId });
}

export async function trackRecommendationClick(sessionId: string, requestingUserId: string | null, productId: string): Promise<void> {
  await trackAIEvent({ event: "AI_RECOMMENDATION_CLICK", sessionId, userId: requestingUserId, productId });
}

export async function trackActionConfirmed(sessionId: string, requestingUserId: string | null, productId: string | undefined, actionType: string): Promise<void> {
  await trackAIEvent({ event: "AI_ACTION_CONFIRMED", sessionId, userId: requestingUserId, productId, extra: { actionType } });
}
