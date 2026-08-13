/**
 * ============================================================
 * SAVEO INTELLIGENCE CORE — Shared Types
 * ============================================================
 * This is the standalone foundation layer described in the brief:
 * a set of independent analytics engines that read existing
 * platform data and turn it into structured, explainable scores.
 *
 * Hard constraints this whole layer respects:
 * - ADDITIVE ONLY: nothing here modifies any existing model,
 *   service, or API route. Every engine is a pure read + compute
 *   function. Nothing here is imported by existing code, so
 *   nothing existing can break by this layer existing.
 * - NO AI MODEL: every score below is a deterministic, explainable
 *   calculation over real Prisma data — not an LLM call, not a
 *   black box. Every score comes with a `reason[]` array stating
 *   exactly which real numbers produced it.
 * - NO UI: this is backend structure only, per the brief.
 * ============================================================
 */

/** The one JSON shape every Intelligence Engine returns, no exceptions. */
export interface IntelligenceResult {
  /** 0-100. What the engine thinks of the subject on its own scale (defined per engine, documented in that engine's file). */
  score: number;
  /** 0-100. How much real data backed this score — NOT the score's quality, but the engine's certainty in it. Low sample sizes lower this honestly rather than hiding behind a fake-confident number. */
  confidence: number;
  /** Plain-language, factual statements — each one traceable to a real number the engine actually read. Never vague ("looks good"); always concrete ("4.6★ avg over 12 reviews"). */
  reason: string[];
  /** ISO timestamp of when this computation ran. Every engine computes live (no caching layer in this first version), so this is always "now" at call time. */
  lastUpdated: string;
}

/** Every engine's public function follows this shape. */
export type IntelligenceComputeFn<TId = string> = (id: TId) => Promise<IntelligenceResult>;

/**
 * Confidence banding helper — shared math so "how many data points
 * justify real confidence" isn't reinvented slightly-differently in
 * each of the 8 engines. Deliberately conservative: a subject with
 * almost no data gets a low-confidence score rather than a
 * misleadingly authoritative one.
 */
export function confidenceFromSampleSize(sampleSize: number, fullConfidenceAt: number): number {
  if (sampleSize <= 0) return 0;
  const ratio = Math.min(1, sampleSize / fullConfidenceAt);
  return Math.round(Math.sqrt(ratio) * 100);
}

/** Clamps any raw computed score into the valid 0-100 range every engine promises. */
export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
