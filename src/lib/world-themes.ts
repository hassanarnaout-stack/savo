export interface WorldTheme {
  heroEmoji: string;
  heroTagline: string;
  heroTaglineAr: string;
  accentGradientFrom: string;
  accentGradientTo: string;
}

/**
 * Discovery Worlds (Design Language v1, batch 3) — real per-category
 * theming. Only categories with an entry here get the full "World"
 * treatment (custom hero, curated sections); every other category
 * keeps the standard grid page exactly as before. Reusable template
 * pattern: add an entry to extend a "World" to another category
 * without touching the page logic itself.
 */
export const WORLD_THEMES: Record<string, WorldTheme> = {
  "chocolates-sweets": {
    heroEmoji: "🍫",
    heroTagline: "Rich, indulgent, and impossible to resist.",
    heroTaglineAr: "غني، فاخر، ولا يُقاوم.",
    accentGradientFrom: "from-[#3d2415]",
    accentGradientTo: "to-saveo-emerald-800",
  },
  "food-snacks": {
    heroEmoji: "🍿",
    heroTagline: "Crunchy, bold, and perfect for any moment.",
    heroTaglineAr: "مقرمش، جريء، ومثالي لأي وقت.",
    accentGradientFrom: "from-saveo-emerald-900",
    accentGradientTo: "to-saveo-emerald-600",
  },
  "saveo-deals": {
    heroEmoji: "⚡",
    heroTagline: "Limited time. Limited stock. Unlimited savings.",
    heroTaglineAr: "وقت محدود، كمية محدودة، توفير بلا حدود.",
    accentGradientFrom: "from-saveo-emerald-800",
    accentGradientTo: "to-saveo-gold-600",
  },
  "mystery-boxes": {
    heroEmoji: "🎁",
    heroTagline: "Curated surprises worth far more than you pay.",
    heroTaglineAr: "مفاجآت منتقاة تساوي أكثر بكثير مما تدفعه.",
    accentGradientFrom: "from-black",
    accentGradientTo: "to-saveo-emerald-900",
  },
  "saveo-rescue-deals": {
    heroEmoji: "🛟",
    heroTagline: "Great products, saved from going to waste.",
    heroTaglineAr: "منتجات رائعة، أُنقذت من الهدر.",
    accentGradientFrom: "from-saveo-emerald-700",
    accentGradientTo: "to-saveo-emerald-500",
  },
  "coffee": {
    heroEmoji: "☕",
    heroTagline: "Every cup, a small ritual worth savoring.",
    heroTaglineAr: "كل فنجان، طقس صغير يستحق التذوق.",
    accentGradientFrom: "from-[#2e1c10]",
    accentGradientTo: "to-saveo-emerald-800",
  },
  "water": {
    heroEmoji: "💧",
    heroTagline: "Pure essentials, delivered without the wait.",
    heroTaglineAr: "أساسيات نقية، توصل بدون انتظار.",
    accentGradientFrom: "from-saveo-emerald-600",
    accentGradientTo: "to-saveo-emerald-800",
  },
  "dairy": {
    heroEmoji: "🥛",
    heroTagline: "Fresh from the farm to your fridge.",
    heroTaglineAr: "طازج من المزرعة إلى ثلاجتك.",
    accentGradientFrom: "from-saveo-gold-600",
    accentGradientTo: "to-saveo-emerald-800",
  },
};

export function getWorldTheme(slug: string): WorldTheme | null {
  return WORLD_THEMES[slug] ?? null;
}
