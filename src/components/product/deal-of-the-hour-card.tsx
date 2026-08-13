"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Flame, Users } from "lucide-react";
import { CountdownTimer } from "@/components/product/countdown-timer";
import { formatKWD } from "@/lib/utils";

interface DealOfHourData {
  id: string;
  endTime: string | Date;
  discountOverride: number | null;
  stockLimit: number;
  buyersCount: number;
  product: {
    id: string;
    name: string;
    nameAr: string | null;
    slug: string;
    originalPrice: number | string;
    saveoPrice: number | string;
    images: { url: string }[];
    supplier: { companyName: string; companyNameAr: string | null; verificationStatus: string };
  };
}

export function DealOfTheHourCard({ deal }: { deal: DealOfHourData }) {
  const t = useTranslations("home");
  const p = useTranslations("product");
  const image = deal.product.images[0]?.url ?? "/placeholder-product.png";
  const discount =
    deal.discountOverride ??
    Math.round(
      ((Number(deal.product.originalPrice) - Number(deal.product.saveoPrice)) / Number(deal.product.originalPrice)) * 100
    );

  return (
    <div className="saveo-aura shadow-luxury overflow-hidden rounded-xl2 bg-saveo-emerald-700 text-white">
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div className="relative aspect-square md:aspect-auto">
          <Image src={image} alt={deal.product.name} fill className="object-cover" />
          <div className="absolute start-3 top-3 flex items-center gap-1 rounded-full bg-saveo-gold-400 px-3 py-1 text-xs font-bold text-saveo-emerald-700">
            <Flame className="h-3.5 w-3.5" /> -{discount}%
          </div>
        </div>
        <div className="flex flex-col justify-center p-6">
          <CountdownTimer dealEndsAt={deal.endTime} />
          <Link href={`/products/${deal.product.slug}`} className="mt-3 text-xl font-bold hover:text-saveo-gold-400">
            {deal.product.name}
          </Link>
          {deal.product.supplier.verificationStatus === "VERIFIED" && (
            <p className="mt-1 text-xs text-white/50">✓ {p("verifiedSupplier")}</p>
          )}

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-saveo-gold-400">
              {formatKWD(Number(deal.product.saveoPrice))}
            </span>
            <span className="text-sm text-white/40 line-through">
              {formatKWD(Number(deal.product.originalPrice))}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-saveo-gold-400/20 px-3 py-1 font-semibold text-saveo-gold-300">
              {t("onlyLeft", { count: deal.stockLimit })}
            </span>
            <span className="flex items-center gap-1.5 text-white/60">
              <Users className="h-3.5 w-3.5" /> {t("buyersToday", { count: deal.buyersCount })}
            </span>
          </div>

          <Link href={`/products/${deal.product.slug}`} className="btn-primary mt-5 w-fit">
            {p("addToCart")}
          </Link>
        </div>
      </div>
    </div>
  );
}
