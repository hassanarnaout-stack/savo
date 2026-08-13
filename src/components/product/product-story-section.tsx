interface HighlightFeature {
  icon: string;
  label: string;
}

export function ProductStorySection({
  productStory,
  originStory,
  highlightFeatures,
  locale,
}: {
  productStory: string | null;
  originStory: string | null;
  highlightFeatures: HighlightFeature[] | null;
  locale: string;
}) {
  if (!productStory && !originStory && (!highlightFeatures || highlightFeatures.length === 0)) return null;

  return (
    <section className="mt-10 rounded-xl2 bg-gradient-to-br from-saveo-emerald-50 to-white p-6">
      <h2 className="mb-4 text-lg font-black text-saveo-emerald-700">
        {locale === "ar" ? "✨ اكتشف القصة" : "✨ Discover the Story"}
      </h2>

      {productStory && (
        <p className="mb-4 text-sm leading-relaxed text-saveo-emerald-800">{productStory}</p>
      )}

      {originStory && (
        <div className="mb-4 rounded-xl2 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-saveo-emerald-700/50">
            {locale === "ar" ? "لماذا اخترناه" : "Why We Chose It"}
          </p>
          <p className="mt-1 text-sm text-saveo-emerald-800">{originStory}</p>
        </div>
      )}

      {highlightFeatures && highlightFeatures.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {highlightFeatures.map((f, i) => (
            <div key={i} className="rounded-xl2 bg-white p-3 text-center shadow-sm">
              <p className="text-2xl">{f.icon}</p>
              <p className="mt-1 text-xs font-semibold text-saveo-emerald-700">{f.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
