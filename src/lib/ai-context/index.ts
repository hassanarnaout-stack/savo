/**
 * ============================================================
 * SAVEO AI CONTEXT BUILDER
 * ============================================================
 * ADDITIVE ONLY. Assembles a unified, safe SaveoAIContext object
 * from Phase 3 (intelligence-access), which itself reads from
 * Phase 2 (Data Warehouse) and Phase 1 (Intelligence Core).
 *
 * NO LLM CALLS ANYWHERE IN THIS LAYER. Intent detection is
 * rule-based. No chat UI, no Claude/OpenAI API — backend context
 * assembly only, per the brief.
 *
 * Usage:
 *   import { buildContext } from "@/lib/ai-context";
 *   const context = await buildContext({
 *     query: "أريد شوكولاتة أقل من 5 KD",
 *     requestingUserId: session?.user?.id ?? null,
 *   });
 *
 * See README.md for architecture, security model, and test results.
 * ============================================================
 */

export * from "./types";
export { buildContext } from "./context-builder";
export type { BuildContextParams } from "./context-builder";
export { parseIntent } from "./intent-parser";
export { logContextBuild, logContextBuildError } from "./audit-log";
export type { ContextAuditEntry } from "./audit-log";
