import { formatKWD, calcDiscountPct } from "@/lib/utils";

export function PriceTag({
  originalPrice,
  saveoPrice,
  size = "md",
}: {
  originalPrice: number;
  saveoPrice: number;
  size?: "sm" | "md" | "lg";
}) {
  const discount = calcDiscountPct(originalPrice, saveoPrice);
  const priceSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`font-extrabold text-saveo-emerald-700 ${priceSize}`}>
        {formatKWD(saveoPrice)}
      </span>
      {discount > 0 && (
        <>
          <span className="text-xs text-saveo-emerald-700/40 line-through">
            {formatKWD(originalPrice)}
          </span>
          <span className="savings-tag">-{discount}%</span>
        </>
      )}
    </div>
  );
}
