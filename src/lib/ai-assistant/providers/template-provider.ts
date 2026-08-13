/**
 * TEMPLATE PROVIDER
 * ============================================================
 * Wraps the existing, unchanged response-composer.ts. Works
 * right now, zero API key. This IS the current default provider.
 * ============================================================
 */
import { composeResponse } from "../response-composer";
import { AIProvider, AIProviderInput, AIProviderOutput } from "./ai-provider";

export class TemplateProvider implements AIProvider {
  readonly name = "template" as const;

  async generate(input: AIProviderInput): Promise<AIProviderOutput> {
    const response = await composeResponse({ context: input.context, compareProductIds: input.compareProductIds, requestingUserId: input.requestingUserId });
    return {
      response,
      confidence: 1.0,
      reason: [response.message],
    };
  }
}
