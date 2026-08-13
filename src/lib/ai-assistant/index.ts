/**
 * ============================================================
 * SAVEO AI SHOPPING ASSISTANT
 * ============================================================
 * ADDITIVE ONLY. ZERO SCHEMA CHANGES. No live LLM call in this
 * phase — responses are template-composed from real Phase 1-4
 * data. Every action is structured and requires the real,
 * unmodified Commerce Layer to actually execute anything.
 *
 * Usage:
 *   import { askAssistant } from "@/lib/ai-assistant";
 *   const response = await askAssistant({
 *     query: "بدي شوكولاتة أقل من 5 دنانير",
 *     sessionId,
 *     requestingUserId: session?.user?.id ?? null,
 *   });
 *
 * See README.md for architecture, security tests, and limitations.
 * ============================================================
 */

export * from "./types";
export { askAssistant, startAssistantSession, trackRecommendationClick, trackActionConfirmed } from "./assistant-service";
export type { AskAssistantParams } from "./assistant-service";
export { resolveAction } from "./action-executor";
export type { ResolvedAction } from "./action-executor";
export { checkForInjection, isKnownProductId } from "./prompt-injection-guard";
export { getMemory, updateMemory, clearMemory, pruneExpiredSessions } from "./conversation-memory";
export { trackAIEvent, getAIAnalyticsSummary } from "./ai-analytics";
export type { AIEventName } from "./ai-analytics";
export type { AIProvider, AIProviderInput, AIProviderOutput } from "./providers/ai-provider";
export { isLLMProviderConfigured } from "./providers/ai-provider";
export { TemplateProvider } from "./providers/template-provider";
export { LLMProvider } from "./providers/llm-provider";
