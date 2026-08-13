/**
 * INTENT PARSER — RULE-BASED, NOT LLM
 * ============================================================
 * Intent detection is structured parsing (regex + keyword
 * matching against real category/brand names from the database),
 * never a model call.
 *
 * MIGRATION NOTE: wantsDiscount, wantsMembersOnly, and dietTags
 * detection below are migrated verbatim (same keyword lists, same
 * matching logic) from the legacy ShoppingAssistantService, which
 * is being retired in favor of this Phase 4/5 pipeline. Nothing
 * about the actual detection rules changed — only where they live.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { IntentType, ParsedIntent } from "./types";

const GIFT_KEYWORDS = ["هدية", "هدايا", "gift", "زوجتي", "زوجي", "لصديق", "لأمي", "لأبي"];
const BUDGET_SHOPPING_KEYWORDS = ["أوفر", "رخيص", "cheap", "budget", "أقل سعر"];
const DEAL_KEYWORDS = ["عرض", "عروض", "خصم", "deal", "flash", "تخفيض"];
const REORDER_KEYWORDS = ["عادة", "أطلب دائماً", "usual", "reorder", "again", "متى يجب"];
const COMPARISON_KEYWORDS = ["أفضل", "قارن", "compare", "vs", "أحسن من"];
const CART_KEYWORDS = ["سلتي", "سلة", "cart", "كيف أوفر في السلة"];
const ORDER_HELP_KEYWORDS = ["طلبي", "order", "شحنة", "توصيل طلبي", "وين طلبي"];

// Migrated verbatim from ShoppingAssistantService.
const DISCOUNT_KEYWORDS = ["discount", "deal", "sale", "off", "cheap", "خصم", "تخفيض", "عرض", "عروض", "رخيص"];
const MEMBERS_KEYWORDS = ["saveo plus", "savo plus", "plus member", "بلس", "أعضاء بلس", "اعضاء بلس"];
const DIET_KEYWORDS: Record<string, string> = {
  healthy: "HEALTHY", "صحي": "HEALTHY", "دايت": "HEALTHY", diet: "HEALTHY",
  vegan: "VEGAN", "نباتي": "VEGAN",
  vegetarian: "VEGETARIAN",
  "gluten free": "GLUTEN_FREE", "gluten-free": "GLUTEN_FREE", "خالي من الغلوتين": "GLUTEN_FREE", "بدون غلوتين": "GLUTEN_FREE",
  "low sugar": "LOW_SUGAR", "قليل السكر": "LOW_SUGAR", "سكر قليل": "LOW_SUGAR",
  keto: "KETO_FRIENDLY", "كيتو": "KETO_FRIENDLY",
};

function extractBudget(query: string): number | null {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:kd|kwd|د\.?ك|دينار|دنانير)/i,
    /(?:أقل من|less than|under|max)\s*(\d+(?:\.\d+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) return value;
    }
  }
  return null;
}

function containsAny(query: string, keywords: string[]): boolean {
  const lower = query.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/** Migrated verbatim from ShoppingAssistantService.parseIntent's dietTags logic. */
function extractDietTags(query: string): string[] {
  const normalized = query.toLowerCase();
  return Object.entries(DIET_KEYWORDS)
    .filter(([keyword]) => normalized.includes(keyword))
    .map(([, tag]) => tag)
    .filter((tag, i, arr) => arr.indexOf(tag) === i);
}

async function matchRealCategory(query: string): Promise<{ id: string; name: string } | null> {
  const categories = await prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, nameAr: true } });
  const lower = query.toLowerCase();

  for (const cat of categories) {
    if (lower.includes(cat.name.toLowerCase())) return { id: cat.id, name: cat.name };
    if (cat.nameAr && query.includes(cat.nameAr)) return { id: cat.id, name: cat.name };
  }
  return null;
}

async function matchRealBrand(query: string): Promise<string | null> {
  const brands = await prisma.product.findMany({
    where: { brandName: { not: null }, status: "ACTIVE" },
    select: { brandName: true },
    distinct: ["brandName"],
    take: 200,
  });
  const lower = query.toLowerCase();
  for (const b of brands) {
    if (b.brandName && lower.includes(b.brandName.toLowerCase())) return b.brandName;
  }
  return null;
}

export async function parseIntent(rawQuery: string): Promise<ParsedIntent> {
  const query = rawQuery.trim();
  const budget = extractBudget(query);
  const isGift = containsAny(query, GIFT_KEYWORDS);
  const wantsDiscount = containsAny(query, DISCOUNT_KEYWORDS);
  const wantsMembersOnly = containsAny(query, MEMBERS_KEYWORDS);
  const dietTags = extractDietTags(query);
  const [category, brand] = await Promise.all([matchRealCategory(query), matchRealBrand(query)]);

  let intent: IntentType = "UNKNOWN";

  if (isGift) intent = "GIFT";
  else if (containsAny(query, CART_KEYWORDS)) intent = "CART_OPTIMIZATION";
  else if (containsAny(query, ORDER_HELP_KEYWORDS)) intent = "ORDER_HELP";
  else if (containsAny(query, REORDER_KEYWORDS)) intent = "REORDER";
  else if (containsAny(query, COMPARISON_KEYWORDS)) intent = "PRODUCT_COMPARISON";
  else if (wantsDiscount || containsAny(query, DEAL_KEYWORDS)) intent = "DEAL_DISCOVERY";
  else if (budget !== null || containsAny(query, BUDGET_SHOPPING_KEYWORDS)) intent = "BUDGET_SHOPPING";
  else if (brand && !category) intent = "BRAND_SEARCH";
  else if (category && !brand) intent = "CATEGORY_SEARCH";
  else if (category || brand || dietTags.length > 0) intent = "PRODUCT_SEARCH";
  else if (query.length > 0) intent = "GENERAL_SHOPPING";

  return {
    intent,
    category: category?.name ?? null,
    budget,
    brand,
    isGift,
    wantsDiscount,
    wantsMembersOnly,
    dietTags,
    rawQuery: query,
  };
}
