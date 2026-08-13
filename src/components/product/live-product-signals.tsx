import { ProductSignalsService } from "@/lib/services/product-signals-service";
import { isLowStock } from "@/lib/utils";

export async function LiveProductSignals({ productId, lowStockAlert }: { productId: string; lowStockAlert: number }) {
  const signals = await ProductSignalsService.getSignals(productId);
  const showLowStock = isLowStock(signals.stockRemaining, lowStockAlert);

  const hasAnySignal = signals.viewersNow || signals.soldToday > 0 || signals.offerEndingSoon || showLowStock;
  if (!hasAnySignal) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
      {signals.viewersNow && (
        <span className="rounded-full bg-saveo-gold-50 px-2.5 py-1 text-saveo-gold-700">🔥 {signals.viewersNow} people viewing</span>
      )}
      {signals.soldToday > 0 && (
        <span className="rounded-full bg-saveo-emerald-50 px-2.5 py-1 text-saveo-emerald-700">⚡ Sold {signals.soldToday} today</span>
      )}
      {signals.offerEndingSoon && (
        <span className="rounded-full bg-saveo-gold-50 px-2.5 py-1 text-saveo-gold-700">⏳ Offer ends soon</span>
      )}
      {showLowStock && (
        <span className="rounded-full bg-saveo-gold-50 px-2.5 py-1 text-saveo-gold-700">📦 Only {signals.stockRemaining} left</span>
      )}
    </div>
  );
}
