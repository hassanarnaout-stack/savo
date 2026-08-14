import { Link } from "@/i18n/routing";
import Image from "next/image";
import { formatKWD } from "@/lib/utils";
import { Award } from "lucide-react";

interface Box {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  saveoPrice: number | string;
  mysteryBoxValueMin?: number | string | null;
  mysteryBoxValueMax?: number | string | null;
  images: { url: string }[];
}

const TIER_STYLE: Record<string, { emoji: string; ring: string }> = {
  bronze: { emoji: "🥉", ring: "ring-amber-400/25" },
  silver: { emoji: "🥈", ring: "ring-slate-300/25" },
  gold: { emoji: "🥇", ring: "ring-saveo-primary/40" },
};

export function MysteryBoxTiers({
  tiers,
  locale,
  labels,
}: {
  tiers: { bronze: Box[]; silver: Box[]; gold: Box[] };
  locale: string;
  labels: { bronze: string; silver: string; gold: string; guaranteedValue: string };
}) {
  const entries: [keyof typeof tiers, string][] = [
    ["bronze", labels.bronze],
    ["silver", labels.silver],
    ["gold", labels.gold],
  ];

  return (
    <div className="grid gap-4 font-manrope sm:grid-cols-3">
      {entries.map(([tier, label]) => {
        const box = tiers[tier][0];
        const style = TIER_STYLE[tier];
        if (!box) return null;
        const name = locale === "ar" && box.nameAr ? box.nameAr : box.name;

        return (
          <Link
            key={box.id}
            href={`/products/${box.slug}`}
            className={`group relative overflow-hidden rounded-2xl bg-white/[0.06] p-5 ring-1 backdrop-blur-sm transition-transform hover:-translate-y-1 ${style.ring}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{style.emoji}</span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-saveo-ink">{label}</span>
            </div>
            <div className="relative mx-auto mt-4 h-32 w-32 overflow-hidden rounded-2xl bg-white/10">
              {box.images[0] && (
                <Image src={box.images[0].url} alt={name} fill className="object-cover transition-transform group-hover:scale-105" />
              )}
            </div>
            <p className="mt-4 line-clamp-2 text-sm font-bold text-white">{name}</p>
            {box.mysteryBoxValueMin && (
              <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                <Award className="h-3.5 w-3.5" />
                {labels.guaranteedValue}: {formatKWD(Number(box.mysteryBoxValueMin))}+
              </p>
            )}
            <p className="mt-2 text-lg font-extrabold text-saveo-primary">{formatKWD(Number(box.saveoPrice))}</p>
          </Link>
        );
      })}
    </div>
  );
}
