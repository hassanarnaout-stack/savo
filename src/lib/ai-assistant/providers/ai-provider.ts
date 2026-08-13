/**
 * AI PROVIDER ABSTRACTION
 * ============================================================
 * The real architectural boundary the brief asks for. Both
 * providers implement the exact same interface and receive the
 * exact same sanitized input — neither ever touches Prisma or
 * the database directly.
 *
 * TemplateProvider works right now, zero API key, wrapping the
 * existing response-composer.ts.
 *
 * LLMProvider is a REAL, structurally complete implementation
 * that calls an LLM API when SAVEO_AI_LLM_ENABLED and
 * SAVEO_AI_LLM_API_KEY are both set — but has never been
 * exercised against a live key in this sandbox. See
 * llm-provider.ts's header for the exact honest status.
 * ============================================================
 */
import { SaveoAIContext } from "@/lib/ai-context";
import { AIAssistantResponse } from "../types";

export interface AIProviderInput {
  context: SaveoAIContext;
  compareProductIds?: string[];
  requestingUserId?: string | null;
}

export interface AIProviderOutput {
  response: AIAssistantResponse;
  confidence: number;
  reason: string[];
}

export interface AIProvider {
  readonly name: "template" | "llm";
  generate(input: AIProviderInput): Promise<AIProviderOutput>;
}

export function isLLMProviderConfigured(): boolean {
  return process.env.SAVEO_AI_LLM_ENABLED === "true" && !!process.env.SAVEO_AI_LLM_API_KEY;
}
