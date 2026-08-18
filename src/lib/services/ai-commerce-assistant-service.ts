import { prisma } from "@/lib/prisma";
import { BusinessDashboardService } from "@/lib/services/business-dashboard-service";
import { BICustomerAnalyticsService } from "@/lib/services/bi-customer-analytics-service";

/**
 * AICommerceAssistantService — Phase 7.2
 *
 * IMPORTANT SCOPE NOTE: no LLM API is wired into this project. "Chat"
 * here is real keyword/intent matching over the admin's question,
 * routed to a handler that queries Saveo's actual database and builds
 * an answer from real numbers — never a language model, never a
 * fabricated answer. Unrecognized questions get an honest "I can't
 * answer that yet" instead of a guessed response. Every handler that
 * finds no data says so explicitly rather than inventing a number.
 */

export interface AssistantAnswer {
  question: string;
  matchedIntent: string | null;
  answer: string;
  data?: unknown;
}

interface Intent {
  name: string;
  keywords: string[];
  handler: () => Promise<{ answer: string; data?: unknown }>;
}

export class AICommerceAssistantService {
  private static async whySalesDropped(): Promise<{ answer: string; data?: unknown }> {
    const now = new Date();
    const thisWeekStart = new Date(now); thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(now); lastWeekStart.setDate(lastWeekStart.getDate() - 14);

    const [thisWeek, lastWeek] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: thisWeekStart }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true }),
      prisma.order.aggregate({ where: { createdAt: { gte: lastWeekStart, lt: thisWeekStart }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true }),
    ]);

    const thisWeekTotal = Number(thisWeek._sum.total ?? 0);
    const lastWeekTotal = Number(lastWeek._sum.total ?? 0);

    if (lastWeekTotal === 0) {
      return { answer: "There isn't enough order history from the prior week to compare against yet." };
    }

    const change = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
    if (change >= 0) {
      return { answer: `Sales actually rose ${change.toFixed(1)}% this week (KD ${thisWeekTotal.toFixed(3)} vs KD ${lastWeekTotal.toFixed(3)} last week) — no drop to explain.`, data: { thisWeekTotal, lastWeekTotal, change } };
    }

    const orderCountChange = thisWeek._count - lastWeek._count;
    return {
      answer: `Sales dropped ${Math.abs(change).toFixed(1)}% this week (KD ${thisWeekTotal.toFixed(3)} vs KD ${lastWeekTotal.toFixed(3)} last week). Order count went from ${lastWeek._count} to ${thisWeek._count} (${orderCountChange >= 0 ? "+" : ""}${orderCountChange}).`,
      data: { thisWeekTotal, lastWeekTotal, change, thisWeekOrders: thisWeek._count, lastWeekOrders: lastWeek._count },
    };
  }

  private static async bestSupplier(): Promise<{ answer: string; data?: unknown }> {
    const top = await BusinessDashboardService.getTopSuppliers(1);
    if (top.length === 0) return { answer: "No supplier has any realized (delivered) sales yet." };
    const s = top[0];
    return { answer: `${s.name} is your top supplier by realized revenue: KD ${s.revenue.toFixed(3)} in sales, KD ${s.commission.toFixed(3)} in commission earned.`, data: s };
  }

  private static async mostValuableCustomers(): Promise<{ answer: string; data?: unknown }> {
    const { topCustomers, averageLTV } = await BICustomerAnalyticsService.getCustomerLTV(5);
    if (topCustomers.length === 0) return { answer: "No customers have completed any orders yet." };
    const list = topCustomers.map((c, i) => `${i + 1}. ${c.name} — KD ${c.ltv.toFixed(3)} (${c.orderCount} orders)`).join("\n");
    return { answer: `Your top 5 customers by lifetime value (platform average: KD ${averageLTV.toFixed(3)}):\n${list}`, data: topCustomers };
  }

  private static async bestProduct(): Promise<{ answer: string; data?: unknown }> {
    const product = await prisma.product.findFirst({
      where: { orderCount: { gt: 0 } },
      orderBy: { orderCount: "desc" },
      select: { name: true, orderCount: true, saveoPrice: true },
    });
    if (!product) return { answer: "No product has any completed orders yet." };
    const revenue = product.orderCount * Number(product.saveoPrice);
    return { answer: `${product.name} is your best-selling product: ${product.orderCount} orders, approximately KD ${revenue.toFixed(3)} in revenue.`, data: product };
  }

  private static async whyConversionDropped(): Promise<{ answer: string; data?: unknown }> {
    const funnel = await BICustomerAnalyticsService.getFunnelAnalysis(30);
    if (!funnel[0] || funnel[0].count === 0) {
      return { answer: "There isn't enough page-view/event data in the last 30 days to analyze conversion." };
    }

    const overallConversion = funnel.at(-1)?.conversionFromStart ?? 0;
    const weakestStep = funnel.slice(1).reduce((worst, step) => (step.conversionFromPrevious < worst.conversionFromPrevious ? step : worst), funnel[1]);

    return {
      answer: `Current 30-day conversion (first step → order) is ${overallConversion}%. The biggest drop-off is at "${weakestStep.name}" — only ${weakestStep.conversionFromPrevious}% of the previous step's visitors made it through. That's the step most likely explaining a conversion decline.`,
      data: funnel,
    };
  }

  private static readonly INTENTS: Intent[] = [
    { name: "why_sales_dropped", keywords: ["انخفضت المبيعات", "sales drop", "why sales", "لماذا انخفضت"], handler: () => this.whySalesDropped() },
    { name: "best_supplier", keywords: ["أفضل مورد", "best supplier", "top supplier"], handler: () => this.bestSupplier() },
    { name: "most_valuable_customers", keywords: ["أكثر العملاء قيمة", "most valuable customer", "top customer", "best customer"], handler: () => this.mostValuableCustomers() },
    { name: "best_product", keywords: ["أفضل منتج", "best product", "best selling", "top product"], handler: () => this.bestProduct() },
    { name: "why_conversion_dropped", keywords: ["انخفض التحويل", "conversion drop", "why conversion"], handler: () => this.whyConversionDropped() },
  ];

  static async ask(question: string): Promise<AssistantAnswer> {
    const normalized = question.toLowerCase();
    const intent = this.INTENTS.find((i) => i.keywords.some((k) => normalized.includes(k.toLowerCase())));

    if (!intent) {
      return {
        question,
        matchedIntent: null,
        answer: "I can't answer that yet — I only understand a specific set of business questions right now (sales trends, top supplier, top customers, best product, conversion). Try rephrasing, or ask one of those.",
      };
    }

    const { answer, data } = await intent.handler();
    return { question, matchedIntent: intent.name, answer, data };
  }
}
