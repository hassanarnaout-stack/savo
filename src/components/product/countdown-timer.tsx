"use client";

import { useEffect, useState } from "react";
import { formatMsToClock, getDealTimeRemaining } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export function CountdownTimer({
  dealEndsAt,
  compact = false,
}: {
  dealEndsAt: string | Date | null;
  compact?: boolean;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const p = useTranslations("product");

  useEffect(() => {
    setRemaining(getDealTimeRemaining(dealEndsAt));
    const interval = setInterval(() => {
      setRemaining(getDealTimeRemaining(dealEndsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [dealEndsAt]);

  if (remaining === null) return null;

  const { days, hours, minutes, seconds } = formatMsToClock(remaining);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-saveo-gold-50 px-2.5 py-1 text-xs font-semibold text-saveo-gold-700">
        <Clock className="h-3 w-3" />
        {days > 0 ? `${days}d ` : ""}
        {hours}:{minutes}:{seconds}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-saveo-gold-600" />
      <span className="text-xs font-medium text-saveo-gold-700">{p("dealEndsIn")}</span>
      <div className="flex gap-1 font-mono text-sm font-bold">
        {days > 0 && <TimeBox label="d" value={days} />}
        <TimeBox label="h" value={hours} />
        <TimeBox label="m" value={minutes} />
        <TimeBox label="s" value={seconds} />
      </div>
    </div>
  );
}

function TimeBox({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded bg-saveo-emerald-700 px-1.5 py-0.5 text-white">
      {value}
      <span className="text-[10px] text-white/60">{label}</span>
    </span>
  );
}
