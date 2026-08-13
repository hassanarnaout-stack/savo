import { prisma } from "@/lib/prisma";

/**
 * AIBrandAssistantService — Phase 5.4 §11
 *
 * "Build the architecture only, without a real AI API." Defines the
 * exact shape a future AI integration would fill in: inputs (product/
 * sales/audience data, genuinely gathered below) and outputs (campaign
 * type, placement, timing, offer suggestions).
 *
 * getSuggestions() currently returns RULE-BASED placeholders computed
 * from real data — not a language model. Swapping in a real AI call
 * later means replacing the body of getSuggestions with a prompt built
 * from the same AIBrandAssistantInput shape.
 */

export interface AIBrandAssistantInput {
  brandId: string;
  productPerformance: { productId: string; productName: string; views: number; sales: number }[];
  audienceSize: number;
}

export interface AIBrandAssistantSuggestion {
  suggestedCampaignType: string;
  suggestedPlacement: string;
  suggestedTiming: string;
  suggestedOffer: string;
  reasoning: string;
}

export class AIBrandAssistantService {
  static async gatherInput(brandId: string): Promise<AIBrandAssistantInput> {
    const slots = await prisma.sponsoredSlot.findMany({
      where: { brandId },
      include: { product: { select: { id: true, name: true, viewCount: true, orderCount: true } } },
    });

    return {
      brandId,
      productPerformance: slots.map((s) => ({
        productId: s.product.id,
        productName: s.product.name,
        views: s.product.viewCount,
        sales: s.product.orderCount,
      })),
      audienceSize: 0,
    };
  }

  static async getSuggestions(brandId: string): Promise<AIBrandAssistantSuggestion[]> {
    const input = await this.gatherInput(brandId);
    const suggestions: AIBrandAssistantSuggestion[] = [];

    for (const p of input.productPerformance) {
      const rate = p.views > 0 ? p.sales / p.views : 0;
      if (p.views > 20 && rate < 0.02) {
        suggestions.push({
          suggestedCampaignType: "PRODUCT_BOOST",
          suggestedPlacement: "HOMEPAGE_TOP",
          suggestedTiming: "Next 7 days",
          suggestedOffer: "10-15% discount",
          reasoning: `${p.productName} has ${p.views} views but only ${p.sales} sales — a boost + discount could convert that traffic.`,
        });
      }
    }

    return suggestions;
  }
}
