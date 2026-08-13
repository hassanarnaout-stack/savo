const BADGE_CONFIG: Record<string, { en: string; ar: string; color: string }> = {
  TRENDING: { en: "🔥 Trending", ar: "🔥 رائج", color: "bg-saveo-gold-100 text-saveo-gold-700" },
  LIMITED: { en: "⏳ Limited", ar: "⏳ محدود", color: "bg-saveo-gold-100 text-saveo-gold-700" },
  EXCLUSIVE: { en: "💎 Exclusive", ar: "💎 حصري", color: "bg-saveo-emerald-900 text-white" },
  SAVEO_PLUS: { en: "👑 Plus Only", ar: "👑 بلس فقط", color: "bg-saveo-gold-100 text-saveo-gold-700" },
  AWARD_WINNER: { en: "🏆 Award Winner", ar: "🏆 حائز جائزة", color: "bg-saveo-gold-200 text-saveo-gold-700" },
  CHEF_CHOICE: { en: "👨‍🍳 Chef's Choice", ar: "👨‍🍳 اختيار الشيف", color: "bg-saveo-emerald-100 text-saveo-emerald-700" },
  HEALTHY_CHOICE: { en: "🥗 Healthy Choice", ar: "🥗 خيار صحي", color: "bg-saveo-emerald-50 text-saveo-emerald-600" },
  KIDS_FAVORITE: { en: "🧸 Kids Favorite", ar: "🧸 المفضل للأطفال", color: "bg-saveo-gold-50 text-saveo-gold-700" },
  PREMIUM: { en: "✨ Premium", ar: "✨ مميز", color: "bg-black text-saveo-gold-400" },
  NEW_ARRIVAL: { en: "🆕 New Arrival", ar: "🆕 وصل حديثاً", color: "bg-saveo-emerald-50 text-saveo-emerald-700" },
  BEST_SELLER: { en: "⭐ Best Seller", ar: "⭐ الأكثر مبيعاً", color: "bg-saveo-emerald-100 text-saveo-emerald-700" },
  EDITORS_PICK: { en: "✏️ Editor's Pick", ar: "✏️ اختيار المحرر", color: "bg-saveo-gold-100 text-saveo-gold-700" },
};

export function ProductBadges({ badges, locale = "en", compact = false }: { badges: { type: string }[]; locale?: string; compact?: boolean }) {
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "gap-1.5"}`}>
      {badges.slice(0, compact ? 2 : undefined).map((b) => {
        const config = BADGE_CONFIG[b.type];
        if (!config) return null;
        return (
          <span key={b.type} className={`rounded-full font-bold ${config.color} ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"}`}>
            {locale === "ar" ? config.ar : config.en}
          </span>
        );
      })}
    </div>
  );
}
