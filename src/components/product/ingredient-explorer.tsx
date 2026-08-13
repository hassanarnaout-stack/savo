"use client";

import { useState } from "react";
import { AlertTriangle, MapPin, Award } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  nameAr: string | null;
  origin: string | null;
  benefit: string | null;
  isAllergen: boolean;
  certificateUrl: string | null;
}

export function IngredientExplorer({ ingredients, locale }: { ingredients: Ingredient[]; locale: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (ingredients.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-black text-saveo-emerald-700">
        {locale === "ar" ? "🌿 استكشف المكوّنات" : "🌿 Ingredient Explorer"}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ingredients.map((ing) => {
          const name = locale === "ar" && ing.nameAr ? ing.nameAr : ing.name;
          const open = openId === ing.id;
          return (
            <button
              key={ing.id}
              onClick={() => setOpenId(open ? null : ing.id)}
              className={`rounded-xl2 border p-3 text-start transition-all ${open ? "border-saveo-emerald-300 bg-saveo-emerald-50" : "border-black/5 bg-white hover:border-saveo-emerald-200"}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold">{name}</p>
                {ing.isAllergen && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              </div>
              {open && (
                <div className="mt-2 space-y-1.5 text-xs text-saveo-emerald-700/70">
                  {ing.origin && (
                    <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ing.origin}</p>
                  )}
                  {ing.benefit && <p>{ing.benefit}</p>}
                  {ing.isAllergen && (
                    <p className="font-semibold text-amber-600">{locale === "ar" ? "يحتوي على مسبب حساسية" : "Contains allergen"}</p>
                  )}
                  {ing.certificateUrl && (
                    <a href={ing.certificateUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-saveo-emerald-600 underline">
                      <Award className="h-3 w-3" /> {locale === "ar" ? "الشهادة" : "Certificate"}
                    </a>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
