import { Crown } from "lucide-react";

export function PlusBadge({ size = "sm" }: { size?: "xs" | "sm" | "md" }) {
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px] gap-0.5",
    sm: "px-2 py-1 text-[10px] gap-1",
    md: "px-2.5 py-1.5 text-xs gap-1",
  }[size];
  const iconSize = { xs: "h-2.5 w-2.5", sm: "h-3 w-3", md: "h-3.5 w-3.5" }[size];

  return (
    <span className={`inline-flex items-center rounded-full bg-saveo-gold-400 font-bold text-saveo-emerald-900 ${sizeClasses}`}>
      <Crown className={iconSize} /> PLUS
    </span>
  );
}
