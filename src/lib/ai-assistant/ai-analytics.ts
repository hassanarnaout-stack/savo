/**
 * AI ANALYTICS
 * ============================================================
 * ZERO SCHEMA CHANGE, by explicit decision. Reuses the existing
 * AnalyticsEvent model — the real AI event name goes into
 * metadata.aiEventName, with metadata.source: "ai_assistant" as
 * an explicit marker distinguishing these from normal storefront
 * events in any query.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import type { AnalyticsEventType } from "@prisma/client";

export type AIEventName =
  | "AI_SESSION_STARTED"
  | "AI_QUERY"
  | "AI_PRODUCT_VIEW"
  | "AI_RECOMMENDATION"
  | "AI_RECOMMENDATION_CLICK"
  | "AI_ADD_TO_CART"
  | "AI_ACTION_CONFIRMED"
  | "AI_PURCHASE"
  | "AI_CONVERSION"
  | "AI_REVENUE";

const EVENT_TYPE_MAP: Record<AIEventName, AnalyticsEventType> = {
  AI_SESSION_STARTED: "PAGE_VIEW",
  AI_QUERY: "PAGE_VIEW",
  AI_PRODUCT_VIEW: "PRODUCT_VIEW",
  AI_RECOMMENDATION: "PRODUCT_VIEW",
  AI_RECOMMENDATION_CLICK: "PRODUCT_VIEW",
  AI_ADD_TO_CART: "ADD_TO_CART",
  AI_ACTION_CONFIRMED: "ADD_TO_CART",
  AI_PURCHASE: "ORDER_COMPLETE",
  AI_CONVERSION: "ORDER_COMPLETE",
  AI_REVENUE: "ORDER_COMPLETE",
};

export interface TrackAIEventParams {
  event: AIEventName;
  sessionId: string;
  userId?: string | null;
  productId?: string | null;
  extra?: Record<string, unknown>;
}

export async function trackAIEvent(params: TrackAIEventParams): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: EVENT_TYPE_MAP[params.event],
        sessionId: params.sessionId,
        userId: params.userId ?? null,
        productId: params.productId ?? null,
        metadata: { source: "ai_assistant", aiEventName: params.event, ...(params.extra ?? {}) },
      },
    });
  } catch {
    // Real failure safety — analytics must never break the assistant.
  }
}

export async function getAIAnalyticsSummary(sinceDate: Date) {
  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: sinceDate }, metadata: { path: ["source"], equals: "ai_assistant" } },
    select: { metadata: true, productId: true, sessionId: true },
  });

  const countByName = new Map<string, number>();
  const productRecCounts = new Map<string, number>();
  const productClickCounts = new Map<string, number>();
  const queryTexts: string[] = [];
  const sessions = new Set<string>();

  for (const e of events) {
    const meta = e.metadata as Record<string, unknown> | null;
    const name = meta?.aiEventName as AIEventName | undefined;
    if (!name) continue;
    countByName.set(name, (countByName.get(name) ?? 0) + 1);
    sessions.add(e.sessionId);

    if (name === "AI_RECOMMENDATION" && e.productId) productRecCounts.set(e.productId, (productRecCounts.get(e.productId) ?? 0) + 1);
    if (name === "AI_RECOMMENDATION_CLICK" && e.productId) productClickCounts.set(e.productId, (productClickCounts.get(e.productId) ?? 0) + 1);
    if (name === "AI_QUERY" && typeof meta?.rawQuery === "string") queryTexts.push(meta.rawQuery);
  }

  const sessionsStarted = countByName.get("AI_SESSION_STARTED") ?? 0;
  const recommendations = countByName.get("AI_RECOMMENDATION") ?? 0;
  const clicks = countByName.get("AI_RECOMMENDATION_CLICK") ?? 0;
  const addToCarts = countByName.get("AI_ADD_TO_CART") ?? 0;
  const purchases = countByName.get("AI_PURCHASE") ?? 0;

  const topQueries = Object.entries(
    queryTexts.reduce<Record<string, number>>((acc, q) => { acc[q] = (acc[q] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([query, count]) => ({ query, count }));

  const topRecommended = Array.from(productRecCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([productId, count]) => ({ productId, count }));

  return {
    sessions: sessions.size,
    sessionsStarted,
    totalQueries: countByName.get("AI_QUERY") ?? 0,
    recommendations,
    recommendationClicks: clicks,
    recommendationClickThroughRate: recommendations > 0 ? Number((clicks / recommendations).toFixed(4)) : null,
    addToCarts,
    addToCartRate: recommendations > 0 ? Number((addToCarts / recommendations).toFixed(4)) : null,
    purchases,
    conversionRate: sessions.size > 0 ? Number((purchases / sessions.size).toFixed(4)) : null,
    topQueries,
    topRecommendedProducts: topRecommended,
  };
}
