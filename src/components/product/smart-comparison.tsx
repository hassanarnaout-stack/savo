import { Link } from "@/i18n/routing";
import { Star } from "lucide-react";
import { formatKWD } from "@/lib/utils";
import type { ComparisonProduct } from "@/lib/services/smart-comparison-service";

export function SmartComparison({ current, alternatives, locale }: { current: ComparisonProduct; alternatives: ComparisonProduct[]; locale: string }) {
  if (alternatives.length === 0) return null;
  const isArabic = locale === "ar";
  const items: (ComparisonProduct & { isCurrent: boolean })[] = [
    { ...current, isCurrent: true },
    ...alternatives.map((a) => ({ ...a, isCurrent: false })),
  ];

  return (
    <section className="savo-pdp-section savo-pdp-section--surface">
      <div className="savo-products-eyebrow">{isArabic ? "المقارنة الذكية" : "Smart Comparison"}</div>
      <h2 className="savo-pdp-section-title">{isArabic ? "كيف يقارن هذا المنتج؟" : "How does it compare?"}</h2>

      <div className="savo-pdp-compare-row">
        {items.map((item) => (
          <div key={item.id} className={`savo-pdp-compare-card${item.isCurrent ? " is-current" : ""}`}>
            <div className="savo-pdp-compare-top">
              {item.imageUrl && <img src={item.imageUrl} alt="" />}
              {item.isCurrent ? (
                <div className="savo-pdp-compare-name">{isArabic ? "هذا المنتج" : "This product"}</div>
              ) : (
                <Link href={`/products/${item.slug}`} className="savo-pdp-compare-name savo-pdp-compare-name--link">
                  {item.name.length > 22 ? item.name.slice(0, 22) + "…" : item.name}
                </Link>
              )}
            </div>
            <div className="savo-pdp-compare-rows">
              <div><span>{isArabic ? "السعر" : "Price"}</span><b>{formatKWD(item.price)}</b></div>
              <div>
                <span>{isArabic ? "التقييم" : "Rating"}</span>
                <b>{item.avgRating !== null ? <><Star size={11} className="savo-pdp-compare-star" /> {item.avgRating} ({item.reviewCount})</> : "—"}</b>
              </div>
              {item.calories !== null && <div><span>{isArabic ? "السعرات" : "Calories"}</span><b>{item.calories} kcal</b></div>}
              {item.sugarG !== null && <div><span>{isArabic ? "السكر" : "Sugar"}</span><b>{item.sugarG}g</b></div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
