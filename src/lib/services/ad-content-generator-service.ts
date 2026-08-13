import { prisma } from "@/lib/prisma";

/**
 * AdContentGeneratorService — Phase 5.3 §3
 *
 * No external LLM/ad-platform API is wired into this app, and the phase
 * brief explicitly avoids external ad-platform integration in this pass.
 * This generates real, usable ad copy from phrase banks keyed by tone and
 * platform — deterministic and inspectable, not a black box, and every
 * generation is saved to `AdContent` so past versions stay usable (never
 * overwritten).
 */

const HEADLINE_BANK: Record<string, string[]> = {
  urgent: ["🔥 Deal Ends Soon — {subject}", "⏰ Last Chance: {subject}", "🚨 Don't Miss Out on {subject}"],
  playful: ["✨ Your New Favorite: {subject}", "😍 Meet {subject}", "🎉 Say Hello to {subject}"],
  premium: ["{subject} — Elevated", "Discover {subject}", "The {subject} Experience"],
  friendly: ["We think you'll love {subject}", "Just for you: {subject}", "{subject} is here!"],
};

const CTA_BANK: Record<string, string[]> = {
  SALES: ["Shop Now", "Grab Yours", "Buy Today"],
  TRAFFIC: ["Explore Now", "See More", "Take a Look"],
  CUSTOMERS: ["Join Saveo", "Sign Up Free", "Get Started"],
  RETENTION: ["Come Back & Save", "Your Deal Awaits", "Welcome Back"],
  AWARENESS: ["Learn More", "Discover Saveo", "See What's New"],
};

const PLATFORM_HASHTAGS: Record<string, string[]> = {
  Instagram: ["#SaveoKW", "#KuwaitDeals", "#ShopSmart"],
  TikTok: ["#SaveoFinds", "#KuwaitTikTok", "#DealAlert"],
  Snapchat: ["#Saveo", "#Q8Deals"],
  Facebook: ["#Saveo", "#KuwaitShopping"],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export interface GeneratedAdCopy {
  headline: string;
  shortDescription: string;
  longDescription: string;
  cta: string;
  hashtags: string[];
}

export class AdContentGeneratorService {
  static generate(params: {
    subject: string;
    targetAudience: string;
    platform: string;
    tone: string;
    goal: string;
  }): GeneratedAdCopy {
    const seed = params.subject.length + params.tone.length + params.platform.length;

    const headlineTemplate = pick(HEADLINE_BANK[params.tone] ?? HEADLINE_BANK.friendly, seed);
    const headline = headlineTemplate.replace("{subject}", params.subject);

    const shortDescription = `${params.subject} — made for ${params.targetAudience || "you"}. Available now on Saveo.`;

    const longDescription = `Looking for something special? ${params.subject} is exactly what ${
      params.targetAudience || "Kuwait shoppers"
    } have been asking for. Whether you're after ${params.goal.toLowerCase()} or just browsing, Saveo brings it straight to your door — fast, easy, and worth it.`;

    const cta = pick(CTA_BANK[params.goal] ?? CTA_BANK.SALES, seed);
    const hashtags = PLATFORM_HASHTAGS[params.platform] ?? PLATFORM_HASHTAGS.Instagram;

    return { headline, shortDescription, longDescription, cta, hashtags };
  }

  static async generateAndSave(params: {
    campaignId?: string;
    productId?: string;
    categoryId?: string;
    subject: string;
    targetAudience: string;
    platform: string;
    tone: string;
    goal: string;
    createdByUserId: string;
  }) {
    const copy = this.generate(params);
    return prisma.adContent.create({
      data: {
        campaignId: params.campaignId,
        productId: params.productId,
        categoryId: params.categoryId,
        targetAudience: params.targetAudience,
        platform: params.platform,
        tone: params.tone,
        goal: params.goal,
        headline: copy.headline,
        shortDescription: copy.shortDescription,
        longDescription: copy.longDescription,
        cta: copy.cta,
        hashtags: copy.hashtags,
        createdByUserId: params.createdByUserId,
      },
    });
  }

  static async getHistory(filters?: { productId?: string; campaignId?: string }) {
    return prisma.adContent.findMany({
      where: { ...(filters?.productId ? { productId: filters.productId } : {}), ...(filters?.campaignId ? { campaignId: filters.campaignId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } }, category: { select: { name: true } } },
      take: 100,
    });
  }
}
