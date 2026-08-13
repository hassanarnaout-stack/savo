import type { WorldTheme } from "@/lib/world-themes";

export function WorldHero({
  theme,
  categoryName,
  categoryNameAr,
  locale,
  productCount,
}: {
  theme: WorldTheme;
  categoryName: string;
  categoryNameAr: string | null;
  locale: string;
  productCount: number;
}) {
  const name = locale === "ar" && categoryNameAr ? categoryNameAr : categoryName;
  const tagline = locale === "ar" ? theme.heroTaglineAr : theme.heroTagline;

  return (
    <section className={`saveo-aura shadow-luxury relative overflow-hidden rounded-xl2 bg-gradient-to-br ${theme.accentGradientFrom} ${theme.accentGradientTo} p-8 text-white sm:p-14`}>
      <div className="relative z-10">
        <p className="mb-2 text-6xl">{theme.heroEmoji}</p>
        <h1 className="text-3xl font-black sm:text-5xl">{name}</h1>
        <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">{tagline}</p>
        <p className="mt-4 text-xs text-white/50">{productCount} {locale === "ar" ? "منتج بانتظارك" : "products waiting to be discovered"}</p>
      </div>
    </section>
  );
}
