/**
 * AUDIT LOG
 * ============================================================
 * Logs that a context WAS built and what it covered — never the
 * sensitive values themselves.
 * ============================================================
 */
import { logger } from "@/lib/logger";

export interface ContextAuditEntry {
  requestingUserId: string | null;
  intent: string;
  sectionsBuilt: string[];
  durationMs: number;
  timestamp: string;
}

export function logContextBuild(entry: ContextAuditEntry): void {
  logger.info("AI context built", {
    requestingUserId: entry.requestingUserId,
    intent: entry.intent,
    sectionsBuilt: entry.sectionsBuilt,
    durationMs: entry.durationMs,
  });
}

export function logContextBuildError(requestingUserId: string | null, error: unknown): void {
  logger.error("AI context build failed", error instanceof Error ? error : new Error(String(error)), { requestingUserId });
}
