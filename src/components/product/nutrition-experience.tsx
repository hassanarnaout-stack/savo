"use client";

/**
 * Daily reference values used are the standard adult reference intake
 * figures (2000 kcal diet) — the same convention used on most GCC
 * nutrition labels. Not product-specific, not invented.
 */
type NutritionNumericKey = "proteinG" | "carbsG" | "sugarG" | "fatG" | "saturatedFatG" | "fiberG" | "sodiumMg";

const DAILY_VALUES: Record<NutritionNumericKey, number> = {
  proteinG: 50,
  carbsG: 275,
  sugarG: 50,
  fatG: 78,
  saturatedFatG: 20,
  fiberG: 28,
  sodiumMg: 2300,
};

const LABELS: Record<NutritionNumericKey, { en: string; ar: string }> = {
  proteinG: { en: "Protein", ar: "بروتين" },
  carbsG: { en: "Carbs", ar: "كربوهيدرات" },
  sugarG: { en: "Sugar", ar: "سكر" },
  fatG: { en: "Fat", ar: "دهون" },
  saturatedFatG: { en: "Saturated Fat", ar: "دهون مشبعة" },
  fiberG: { en: "Fiber", ar: "ألياف" },
  sodiumMg: { en: "Sodium", ar: "صوديوم" },
};

interface NutritionFact {
  servingSize: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  sugarG: number | null;
  fatG: number | null;
  saturatedFatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  dietTags: string[];
}

export function NutritionExperience({ fact, locale }: { fact: NutritionFact; locale: string }) {
  const rows = (Object.keys(DAILY_VALUES) as (keyof typeof DAILY_VALUES)[])
    .filter((key) => fact[key] != null)
    .map((key) => ({
      key,
      label: locale === "ar" ? LABELS[key].ar : LABELS[key].en,
      value: fact[key] as number,
      unit: key === "sodiumMg" ? "mg" : "g",
      percent: Math.min(100, Math.round(((fact[key] as number) / DAILY_VALUES[key]) * 100)),
    }));

  if (rows.length === 0 && fact.calories == null) return null;

  return (
    <section className="mt-10 rounded-xl2 border border-black/5 bg-white p-6">
      <h2 className="mb-4 text-lg font-black text-saveo-emerald-700">
        {locale === "ar" ? "📊 معلومات التغذية" : "📊 Nutrition Facts"}
      </h2>
      {fact.servingSize && (
        <p className="mb-3 text-xs text-saveo-emerald-700/50">
          {locale === "ar" ? "حجم الحصة:" : "Serving size:"} {fact.servingSize}
        </p>
      )}
      {fact.calories != null && (
        <p className="mb-4 text-2xl font-black text-saveo-emerald-800">
          {fact.calories} <span className="text-sm font-normal text-saveo-emerald-700/50">kcal</span>
        </p>
      )}
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{r.label}</span>
              <span className="text-saveo-emerald-700/50">{r.value}{r.unit} · {r.percent}% DV</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/5">
              <div className="h-full rounded-full bg-saveo-emerald-500" style={{ width: `${r.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
      {fact.dietTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {fact.dietTags.map((tag) => (
            <span key={tag} className="rounded-full bg-saveo-emerald-50 px-2.5 py-1 text-[10px] font-bold text-saveo-emerald-700">
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
      <p className="mt-4 text-[10px] text-saveo-emerald-700/40">
        {locale === "ar" ? "% القيمة اليومية مبنية على نظام غذائي 2000 سعرة حرارية" : "% Daily Value based on a 2000 calorie diet"}
      </p>
    </section>
  );
}
