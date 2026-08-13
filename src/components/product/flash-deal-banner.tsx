import { CountdownTimer } from "@/components/product/countdown-timer";
import { formatKWD } from "@/lib/utils";
import { Zap } from "lucide-react";

export function FlashDealBanner({
  discountPercent,
  dealPrice,
  originalPrice,
  remaining,
  stockLimit,
  endAt,
  locale,
}: {
  discountPercent: number;
  dealPrice: number;
  originalPrice: number;
  remaining: number;
  stockLimit: number;
  endAt: Date;
  locale: string;
}) {
  const soldPercent = Math.round(((stockLimit - remaining) / stockLimit) * 100);

  return (
    <div className="saveo-aura shadow-luxury relative overflow-hidden rounded-xl2 bg-gradient-to-r from-saveo-emerald-800 to-saveo-emerald-600 p-4 text-white">
      <div className="relative z-10 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-black">
          <Zap className="h-4 w-4 text-saveo-gold-400" /> {locale === "ar" ? "عرض خاطف" : "Flash Deal"} — {discountPercent}%{" "}
          {locale === "ar" ? "خصم" : "OFF"}
        </p>
        <CountdownTimer dealEndsAt={endAt} compact />
      </div>
      <div className="relative z-10 mt-2 flex items-baseline gap-2">
        <span className="text-xl font-black text-saveo-gold-400">{formatKWD(dealPrice)}</span>
        <span className="text-sm text-white/60 line-through">{formatKWD(originalPrice)}</span>
      </div>
      <div className="relative z-10 mt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-saveo-gold-400" style={{ width: `${soldPercent}%` }} />
        </div>
        <p className="mt-1 text-xs text-white/80">
          {locale === "ar" ? `تبقّى ${remaining} فقط!` : `Only ${remaining} left!`}
        </p>
      </div>
    </div>
  );
}
