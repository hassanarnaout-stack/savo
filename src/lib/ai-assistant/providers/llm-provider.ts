/**
 * LLM PROVIDER
 * ============================================================
 * ⚠️ HONEST STATUS: real, structurally complete implementation —
 * NOT a stub. But NEVER exercised against a live API key in this
 * sandbox, because this environment has no network access to any
 * LLM API endpoint. Ready to be enabled/tested in the real
 * environment, not verified here.
 *
 * SAFETY CONTRACT (enforced by construction):
 * - This file imports NOTHING from @/lib/prisma — no import path
 *   to the database exists here at all. Receives only the already-
 *   sanitized SaveoAIContext (Phase 4, already stripped of supplier/
 *   admin/commission fields by Phase 3's type allowlists).
 * - The LLM must return a fixed JSON shape, validated before use —
 *   free-text/unstructured output is rejected outright.
 * - Every product shown is looked up from the REAL context by the
 *   ID the model returned — a model-invented ID not actually in
 *   the context is silently dropped, never trusted or displayed.
 * ============================================================
 */
import { AIProvider, AIProviderInput, AIProviderOutput } from "./ai-provider";
import { TemplateProvider } from "./template-provider";
import { AIProductCard, StructuredAction } from "../types";

const LLM_RESPONSE_SCHEMA_HINT = `Return ONLY JSON: { "message": string, "productIds": string[], "actionTypes": ("VIEW_PRODUCT"|"ADD_TO_CART")[], "confidence": number }`;

interface RawLLMOutput {
  message?: unknown;
  productIds?: unknown;
  actionTypes?: unknown;
  confidence?: unknown;
}

function parseLLMOutput(raw: string): { message: string; productIds: string[]; confidence: number } | null {
  let parsed: RawLLMOutput;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed.message !== "string") return null;
  if (!Array.isArray(parsed.productIds) || !parsed.productIds.every((id) => typeof id === "string")) return null;
  const confidence = typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1 ? parsed.confidence : 0.5;
  return { message: parsed.message, productIds: parsed.productIds as string[], confidence };
}

export class LLMProvider implements AIProvider {
  readonly name = "llm" as const;
  private templateFallback = new TemplateProvider();

  async generate(input: AIProviderInput): Promise<AIProviderOutput> {
    const apiKey = process.env.SAVEO_AI_LLM_API_KEY;
    const apiUrl = process.env.SAVEO_AI_LLM_API_URL ?? "https://api.anthropic.com/v1/messages";

    if (!apiKey) {
      return this.templateFallback.generate(input);
    }

    const sanitizedContext = JSON.stringify(input.context);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          messages: [{ role: "user", content: `${LLM_RESPONSE_SCHEMA_HINT}\n\nCustomer context:\n${sanitizedContext}\n\nQuery: ${input.context.intent.rawQuery}` }],
        }),
      });

      if (!res.ok) return this.templateFallback.generate(input);

      const data = await res.json();
      const text = data?.content?.[0]?.text;
      if (typeof text !== "string") return this.templateFallback.generate(input);

      const parsed = parseLLMOutput(text);
      if (!parsed) return this.templateFallback.generate(input);

      const realProductPool = new Map<string, AIProductCard>();
      if (input.context.product) {
        realProductPool.set(input.context.product.productId, {
          productId: input.context.product.productId, productName: input.context.product.productName,
          slug: "", brand: input.context.product.brand, price: input.context.product.price, originalPrice: null,
          image: null, stockQty: input.context.product.available ? 1 : 0, rating: input.context.product.rating,
          available: input.context.product.available, savings: null, aiReason: parsed.message,
          actions: [{ type: "VIEW_PRODUCT", productId: input.context.product.productId, requiresConfirmation: false, confirmationText: null }],
        });
      }
      for (const r of input.context.recommendations?.items ?? []) {
        realProductPool.set(r.productId, {
          productId: r.productId, productName: r.productName, slug: r.slug, brand: null,
          price: r.price, originalPrice: r.originalPrice > r.price ? r.originalPrice : null,
          image: r.image, stockQty: r.stockQty, rating: null, available: r.stockQty > 0,
          savings: r.originalPrice > r.price ? Number((r.originalPrice - r.price).toFixed(3)) : null,
          aiReason: parsed.message,
          actions: [{ type: "VIEW_PRODUCT", productId: r.productId, requiresConfirmation: false, confirmationText: null }],
        });
      }

      const verifiedCards = parsed.productIds.map((id) => realProductPool.get(id)).filter((c): c is AIProductCard => !!c);

      return {
        response: {
          message: parsed.message,
          productCards: verifiedCards,
          comparisonCard: null,
          budgetBasket: null,
          suggestedActions: [] as StructuredAction[],
          suggestedPrompts: [],
          context: input.context,
          flaggedInput: false,
        },
        confidence: parsed.confidence,
        reason: [parsed.message],
      };
    } catch {
      return this.templateFallback.generate(input);
    }
  }
}
