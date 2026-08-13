import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { AnalyticsEventType } from "@prisma/client";

/**
 * AnalyticsService — Phase 5.6
 *
 * Server-side tracking. Never throws — a failed analytics write must
 * never break the business operation that triggered it (same
 * fire-and-forget contract as NotificationService).
 */
export class AnalyticsService {
  static async track(params: {
    type: AnalyticsEventType;
    sessionId: string;
    userId?: string | null;
    productId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await prisma.analyticsEvent.create({
        data: {
          type: params.type,
          sessionId: params.sessionId,
          userId: params.userId ?? null,
          productId: params.productId ?? null,
          metadata: params.metadata as any,
        },
      });
    } catch (err) {
      logger.error("Analytics event write failed", err, { type: params.type });
    }
  }
}
