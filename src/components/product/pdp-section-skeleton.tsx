/**
 * Lightweight Suspense fallback for streamed below-the-fold PDP
 * sections (Reviews, Smart Comparison, FBT, recommendation rails).
 * Defaults to dark now that the whole PDP is V22-dark (previously
 * this defaulted "light" to match the pre-migration light PDP theme
 * — that's obsolete now the entire page uses --savo-shell-* dark
 * tokens). Sized to each section's approximate real height to avoid
 * layout shift. No product data, real or fake — just shape.
 */
export function PdpSectionSkeleton({ variant, tone = "dark" }: { variant: "block" | "rail"; tone?: "light" | "dark" }) {
  const pulse = tone === "dark" ? "bg-white/[0.06]" : "bg-saveo-emerald-700/[0.04]";
  const wrap = tone === "dark" ? "bg-saveo-ink" : "bg-white";

  if (variant === "rail") {
    return (
      <section className={`py-6 ${wrap}`} aria-hidden="true">
        <div className={`mb-5 h-6 w-40 animate-pulse rounded ${pulse}`} />
        <div className="flex gap-3.5 overflow-hidden pb-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-40 shrink-0 sm:w-48">
              <div className={`aspect-square animate-pulse rounded-2xl ${pulse}`} />
              <div className={`mt-2 h-3 w-3/4 animate-pulse rounded ${pulse}`} />
              <div className={`mt-1.5 h-3 w-1/2 animate-pulse rounded ${pulse}`} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={`mb-[72px] rounded-[20px] border border-saveo-border p-8 ${wrap}`} aria-hidden="true">
      <div className={`h-3 w-24 animate-pulse rounded ${pulse}`} />
      <div className={`mt-3 h-7 w-56 animate-pulse rounded ${pulse}`} />
      <div className="mt-7 space-y-3">
        <div className={`h-4 w-full animate-pulse rounded ${pulse}`} />
        <div className={`h-4 w-5/6 animate-pulse rounded ${pulse}`} />
        <div className={`h-4 w-2/3 animate-pulse rounded ${pulse}`} />
      </div>
    </section>
  );
}
