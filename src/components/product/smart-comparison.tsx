import { Link } from "@/i18n/routing";
import { Star } from "lucide-react";
import type { ComparisonProduct } from "@/lib/services/smart-comparison-service";

function Row({ label, current, alternatives, render }: { label: string; current: ComparisonProduct; alternatives: ComparisonProduct[]; render: (p: ComparisonProduct) => React.ReactNode }) {
  return (
    <tr className="border-t border-black/5">
      <td className="p-2.5 text-xs font-semibold text-saveo-emerald-700/50">{label}</td>
      <td className="bg-saveo-emerald-50 p-2.5 text-center text-sm font-bold">{render(current)}</td>
      {alternatives.map((a) => (
        <td key={a.id} className="p-2.5 text-center text-sm">{render(a)}</td>
      ))}
    </tr>
  );
}

export function SmartComparison({ current, alternatives, locale }: { current: ComparisonProduct; alternatives: ComparisonProduct[]; locale: string }) {
  if (alternatives.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-black text-saveo-emerald-700">
        {locale === "ar" ? "⚖️ قارن مع خيارات مشابهة" : "⚖️ Smart Comparison"}
      </h2>
      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full">
          <thead>
            <tr>
              <td className="p-2.5" />
              <td className="bg-saveo-emerald-50 p-2.5 text-center">
                <p className="text-xs font-bold text-saveo-emerald-700">This Product</p>
              </td>
              {alternatives.map((a) => (
                <td key={a.id} className="p-2.5 text-center">
                  <Link href={`/products/${a.slug}`} className="text-xs font-semibold text-saveo-emerald-700 hover:underline">
                    {a.name.length > 20 ? a.name.slice(0, 20) + "…" : a.name}
                  </Link>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Price" current={current} alternatives={alternatives} render={(p) => `${p.price.toFixed(3)} KD`} />
            <Row
              label="Rating"
              current={current}
              alternatives={alternatives}
              render={(p) => p.avgRating !== null ? (
                <span className="flex items-center justify-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-saveo-gold-400 text-saveo-gold-400" /> {p.avgRating} ({p.reviewCount})
                </span>
              ) : "—"}
            />
            <Row label="Calories" current={current} alternatives={alternatives} render={(p) => p.calories !== null ? `${p.calories} kcal` : "—"} />
            <Row label="Sugar" current={current} alternatives={alternatives} render={(p) => p.sugarG !== null ? `${p.sugarG}g` : "—"} />
          </tbody>
        </table>
      </div>
    </section>
  );
}
