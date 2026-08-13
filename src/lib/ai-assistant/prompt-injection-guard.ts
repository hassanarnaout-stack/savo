/**
 * PROMPT INJECTION GUARD
 * ============================================================
 * This phase has no live LLM call — responses are template-
 * composed from real Context data, so classic LLM-jailbreak
 * injection has no model to hijack here. This guard still defends
 * against two real things:
 * 1. Price/discount manipulation attempts embedded in free text —
 *    must never influence StructuredAction construction, which
 *    only ever reads real Phase 4 context prices.
 * 2. Attempts to make the query parser leak internal/other-customer
 *    data — flagged so the caller responds safely.
 * ============================================================
 */

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /(?:the\s+)?price\s+is\s+(?:actually|really|now)\s+\d/i,
  /(?:السعر|الخصم)\s*(?:الحقيقي|الفعلي)?\s*(?:هو|صار)\s*\d/i,
  /set\s+(?:the\s+)?price\s+to/i,
  /apply\s+(?:a\s+)?\d+%?\s+discount\s+(?:automatically|now|please)/i,

  /supplier\s+(?:cost|margin|commission)/i,
  /(?:تكلفة|هامش|عمولة)\s+المورد/i,
  /(?:show|give|tell)\s+me\s+(?:customer|user)\s+[\w-]+(?:'s)?\s+(?:cart|data|order|wallet)/i,
  /admin\s+(?:intelligence|score|panel|access)/i,

  /ignore\s+(?:the\s+)?(?:previous|above|all)\s+instructions/i,
  /تجاهل\s+(?:كل\s+)?(?:التعليمات|الأوامر)\s+(?:السابقة)?/i,
  /you\s+are\s+now\s+(?:a|an)\s/i,
  /system\s*:\s*/i,
];

export interface InjectionCheckResult {
  flagged: boolean;
  matchedPatterns: number;
}

export function checkForInjection(rawQuery: string): InjectionCheckResult {
  let matches = 0;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(rawQuery)) matches++;
  }
  return { flagged: matches > 0, matchedPatterns: matches };
}

export function isKnownProductId(productId: string, knownProductIds: readonly string[]): boolean {
  return knownProductIds.includes(productId);
}
