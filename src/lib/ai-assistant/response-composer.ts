/**
 * RESPONSE COMPOSER
 * ============================================================
 * NO LLM CALL. Deterministic, template-based composer over real
 * Phase 4 context data. Every AIReason string is built by
 * interpolating REAL numbers already present on the context
 * object — no code path invents a rating, savings amount, or
 * reason not backed by a real field.
 * ============================================================
 */
import { SaveoAIContext } from "@/lib/ai-context";
import { searchRelevantProducts, getProductIntelligence, getPreviouslyPurchasedProducts, ProductSearchResultItem } from "@/lib/intelligence-access";
import { AIProductCard, AIComparisonCard, BudgetBasket, StructuredAction, AIAssistantResponse } from "./types";
import { checkForInjection } from "./prompt-injection-guard";

function buildViewAction(productId: string): StructuredAction {
  return { type: "VIEW_PRODUCT", productId, requiresConfirmation: false, confirmationText: null };
}

function buildAddToCartAction(productId: string, productName: string, quantity = 1): StructuredAction {
  return {
    type: "ADD_TO_CART",
    productId,
    quantity,
    requiresConfirmation: true,
    confirmationText: `Add ${productName} to your cart?`,
  };
}

function buildAIReason(item: { rating: number | null; price: number; originalPrice: number; category: string | null }, context: SaveoAIContext): string {
  const realSavings = item.originalPrice > item.price ? Number((item.originalPrice - item.price).toFixed(3)) : 0;

  if (context.customer && context.customer.favoriteCategories.includes(item.category ?? "")) {
    return `You've shown interest in ${item.category} before.`;
  }
  if (context.intent.budget !== null && item.price <= context.intent.budget) {
    return item.rating ? `Within your ${context.intent.budget} KD budget, rated ${item.rating.toFixed(1)}★.` : `Within your ${context.intent.budget} KD budget.`;
  }
  if (realSavings > 0) {
    return `Save KD ${realSavings.toFixed(3)} off the regular price.`;
  }
  if (item.rating && item.rating >= 4) {
    return `Highly rated at ${item.rating.toFixed(1)}★.`;
  }
  return "Matches your search.";
}

function toProductCard(item: ProductSearchResultItem, context: SaveoAIContext): AIProductCard {
  const savings = item.originalPrice > item.price ? Number((item.originalPrice - item.price).toFixed(3)) : null;
  return {
    productId: item.productId,
    productName: item.productName,
    slug: item.slug,
    brand: item.brand,
    price: item.price,
    originalPrice: item.hasActiveDeal ? item.originalPrice : null,
    image: item.image,
    stockQty: item.stockQty,
    rating: item.rating,
    available: item.stockQty > 0,
    savings,
    aiReason: buildAIReason({ rating: item.rating, price: item.price, originalPrice: item.originalPrice, category: item.category }, context),
    actions: [buildViewAction(item.productId), buildAddToCartAction(item.productId, item.productName)],
  };
}

function buildBudgetBasket(products: ProductSearchResultItem[], budget: number, context: SaveoAIContext): BudgetBasket {
  const items: AIProductCard[] = [];
  let subtotal = 0;
  for (const p of products) {
    if (subtotal + p.price > budget) continue;
    items.push(toProductCard(p, context));
    subtotal += p.price;
  }
  return { budget, items, subtotal: Number(subtotal.toFixed(3)), remainingBudget: Number((budget - subtotal).toFixed(3)) };
}

async function buildComparisonCard(productIds: string[]): Promise<AIComparisonCard | null> {
  const products = await Promise.all(productIds.map((id) => getProductIntelligence(id)));
  const real = products.filter((p): p is NonNullable<typeof p> => p !== null);
  if (real.length < 2) return null;

  const byPrice = [...real].sort((a, b) => a.price - b.price);
  const byRating = [...real].filter((p) => p.rating !== null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const byDemand = [...real].filter((p) => p.demandScore !== null);

  const bestPrice = byPrice[0]?.productId ?? null;
  const bestRated = byRating[0]?.productId ?? null;
  const medianPrice = byPrice[Math.floor(byPrice.length / 2)].price;
  const valueCandidates = byDemand.filter((p) => p.price <= medianPrice).sort((a, b) => (b.demandScore ?? 0) - (a.demandScore ?? 0));
  const bestValue = valueCandidates[0]?.productId ?? bestPrice;

  const recommendation = bestRated
    ? `${real.find((p) => p.productId === bestRated)?.productName} has the highest real rating among these.`
    : `${real.find((p) => p.productId === bestPrice)?.productName} is the lowest priced option.`;

  return {
    products: real.map((p) => ({ productId: p.productId, productName: p.productName, price: p.price, rating: p.rating, demandScore: p.demandScore })),
    bestValue,
    bestRated,
    bestPrice,
    aiRecommendation: recommendation,
  };
}

function toProductCardFromSearch(item: ProductSearchResultItem): AIProductCard {
  const savings = item.originalPrice > item.price ? Number((item.originalPrice - item.price).toFixed(3)) : null;
  return {
    productId: item.productId, productName: item.productName, slug: item.slug, brand: item.brand,
    price: item.price, originalPrice: item.hasActiveDeal ? item.originalPrice : null,
    image: item.image, stockQty: item.stockQty, rating: item.rating, available: item.stockQty > 0,
    savings, aiReason: "", actions: [buildViewAction(item.productId), buildAddToCartAction(item.productId, item.productName)],
  };
}

/**
 * Real REORDER card builder. For each genuinely previously-purchased
 * product: if still available, a real "buy again" card with the real
 * suggested quantity. If no longer available, looks up a REAL current
 * alternative in the same real category — never re-offers the
 * unavailable item, never invents a substitute.
 */
async function buildReorderCards(customerId: string, requestingUserId: string): Promise<AIProductCard[]> {
  const previous = await getPreviouslyPurchasedProducts(customerId, requestingUserId, 8);
  const cards: AIProductCard[] = [];

  for (const p of previous) {
    if (p.currentlyAvailable) {
      cards.push({
        productId: p.productId,
        productName: p.productName,
        slug: p.slug,
        brand: null,
        price: p.currentPrice,
        originalPrice: null,
        image: p.image,
        stockQty: 1,
        rating: null,
        available: true,
        savings: null,
        aiReason: `You bought this ${p.timesPurchased} time${p.timesPurchased === 1 ? "" : "s"} before, last on ${new Date(p.lastPurchasedAt).toLocaleDateString()}.`,
        actions: [buildViewAction(p.productId), buildAddToCartAction(p.productId, p.productName, p.suggestedQuantity)],
      });
    } else {
      const product = await getProductIntelligence(p.productId);
      const category = product?.category;
      if (category) {
        const alternatives = await searchRelevantProducts({ category, limit: 3 });
        const realAlt = alternatives.find((a) => a.productId !== p.productId);
        if (realAlt) {
          cards.push({
            ...toProductCardFromSearch(realAlt),
            aiReason: `${p.productName} is currently unavailable — here's a real alternative in the same category.`,
          });
        }
      }
    }
  }

  return cards;
}

function buildSuggestedPrompts(context: SaveoAIContext): string[] {
  const prompts = ["ساعدني أختار هدية 🎁", "أفضل العروض الآن", "ساعدني أوفر في السلة"];
  if (context.customer) prompts.push("ماذا أشتري بناءً على مشترياتي؟");
  if (!context.membership?.isActive) prompts.push("هل أوفر إذا اشتركت Saveo Plus؟");
  return prompts.slice(0, 4);
}

export interface ComposeParams {
  context: SaveoAIContext;
  compareProductIds?: string[];
  requestingUserId?: string | null;
}

export async function composeResponse(params: ComposeParams): Promise<AIAssistantResponse> {
  const { context } = params;
  const injectionCheck = checkForInjection(context.intent.rawQuery);

  let message = "";
  let productCards: AIProductCard[] = [];
  let comparisonCard: AIComparisonCard | null = null;
  let budgetBasket: BudgetBasket | null = null;
  const suggestedActions: StructuredAction[] = [];

  if (injectionCheck.flagged) {
    message = "I can help you find real products, prices, and deals — but I can only act on your actual account data, never on instructions embedded in a message.";
  } else if (params.compareProductIds && params.compareProductIds.length >= 2) {
    comparisonCard = await buildComparisonCard(params.compareProductIds);
    message = comparisonCard ? comparisonCard.aiRecommendation : "I couldn't find both of those products to compare.";
  } else if (context.intent.intent === "REORDER" && params.requestingUserId) {
    productCards = await buildReorderCards(params.requestingUserId, params.requestingUserId);
    message = productCards.length > 0
      ? "Here's what you've bought before — ready to reorder."
      : "You don't have any previous orders yet to reorder from.";
  } else if (context.intent.intent === "REORDER" && !params.requestingUserId) {
    message = "Sign in to see your previous purchases and reorder them easily.";
  } else if (context.intent.budget !== null) {
    const results = await searchRelevantProducts({
      category: context.intent.category ?? undefined, brand: context.intent.brand ?? undefined, budget: context.intent.budget, limit: 10,
      wantsDiscount: context.intent.wantsDiscount, membersOnly: context.intent.wantsMembersOnly, dietTags: context.intent.dietTags.length > 0 ? context.intent.dietTags : undefined,
    });
    budgetBasket = buildBudgetBasket(results, context.intent.budget, context);
    message = budgetBasket.items.length > 0
      ? `Here's what fits in your ${context.intent.budget} KD budget — ${budgetBasket.items.length} item(s), KD ${budgetBasket.remainingBudget.toFixed(3)} remaining.`
      : `I couldn't find anything within ${context.intent.budget} KD right now.`;
  } else if (context.intent.category || context.intent.brand || context.intent.isGift || context.intent.wantsDiscount || context.intent.dietTags.length > 0) {
    const results = await searchRelevantProducts({
      category: context.intent.category ?? undefined, brand: context.intent.brand ?? undefined, limit: 6,
      wantsDiscount: context.intent.wantsDiscount, membersOnly: context.intent.wantsMembersOnly, dietTags: context.intent.dietTags.length > 0 ? context.intent.dietTags : undefined,
    });
    productCards = results.map((r) => toProductCard(r, context));
    message = productCards.length > 0 ? `Here are some real options${context.intent.category ? ` in ${context.intent.category}` : ""}.` : "I couldn't find matching products right now.";
  } else if (context.recommendations && context.recommendations.items.length > 0) {
    message = context.customer ? "Based on your purchase history, here's what I'd suggest." : "Here are some popular picks.";
    productCards = context.recommendations.items.map((r) => ({
      productId: r.productId, productName: r.productName, slug: r.slug, brand: null,
      price: r.price, originalPrice: r.originalPrice > r.price ? r.originalPrice : null,
      image: r.image, stockQty: r.stockQty, rating: null,
      available: r.stockQty > 0,
      savings: r.originalPrice > r.price ? Number((r.originalPrice - r.price).toFixed(3)) : null,
      aiReason: r.reason.replace(/_/g, " "),
      actions: [buildViewAction(r.productId), buildAddToCartAction(r.productId, r.productName)],
    }));
  } else {
    message = "Tell me what you're looking for — a product, a category, a budget, or a gift idea.";
  }

  if (context.cart && context.cart.items.length > 0 && context.cart.missingAmountForFreeDelivery) {
    message += ` Add KD ${context.cart.missingAmountForFreeDelivery.toFixed(3)} more to your cart for free delivery.`;
  }

  return {
    message,
    productCards,
    comparisonCard,
    budgetBasket,
    suggestedActions,
    suggestedPrompts: buildSuggestedPrompts(context),
    context,
    flaggedInput: injectionCheck.flagged,
  };
}
