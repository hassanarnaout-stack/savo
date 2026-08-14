import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Zap, Clock, ArrowRight } from "lucide-react";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { formatKWD } from "@/lib/utils";
import { CountdownTimer } from "@/components/product/countdown-timer";

export async function FlashDealsRail({ locale }: { locale: string }) {
  const deals = await FlashDealService.getAllLiveDeals(8);
  if (deals.length === 0) return null;

  const [hero, ...rest] = deals;
  const heroName = locale === "ar" && hero.product.nameAr ? hero.product.nameAr : hero.product.name;
  const heroPrice = FlashDealService.effectivePrice(Number(hero.product.saveoPrice), hero.discountPercent);

  return (
    <section className="bg-saveo-ink font-manrope">
      {/* Live event strip — ported from Figma's fire gradient header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-saveo-accent to-[#c23000] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 animate-figma-dot rounded-full bg-white" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white sm:text-[13px]">
            {locale === "ar" ? "مباشر · عروض سريعة" : "LIVE · Flash Sale"}
          </span>
        </div>
        <Link
          href="/products?type=DEAL"
          className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/[0.15] px-4 py-[7px] text-xs font-semibold text-white"
        >
          {locale === "ar" ? "كل العروض" : "All Deals"} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-10">
        {/* Hero deal */}
        <Link href={`/products/${hero.product.slug}`} className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-saveo-ink-mid">
          <div className="relative h-[220px] sm:h-[320px]">
            {hero.product.images[0] && (
              <Image src={hero.product.images[0].url} alt={heroName} fill className="object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-saveo-ink/90 via-saveo-ink/10 to-transparent" />
            <div className="figma-badge-discount absolute start-4 top-4 !text-[15px]">
              <span className="figma-badge-dash">-</span>
              {hero.discountPercent}%
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <p className="line-clamp-1 text-base font-bold text-white sm:text-lg">{heroName}</p>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="font-display text-2xl font-extrabold text-saveo-primary sm:text-[32px]">{formatKWD(heroPrice)}</span>
                <span className="text-sm text-white/45 line-through">{formatKWD(Number(hero.product.saveoPrice))}</span>
              </div>
              <div className="mt-2.5">
                <CountdownTimer dealEndsAt={hero.endAt} compact />
              </div>
            </div>
          </div>
        </Link>

        {/* Supporting deals */}
        <div className="flex flex-col gap-3">
          {rest.slice(0, 3).map((deal) => {
            const dealPrice = FlashDealService.effectivePrice(Number(deal.product.saveoPrice), deal.discountPercent);
            const remaining = FlashDealService.getRemainingStock(deal);
            const name = locale === "ar" && deal.product.nameAr ? deal.product.nameAr : deal.product.name;
            return (
              <Link
                key={deal.id}
                href={`/products/${deal.product.slug}`}
                className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-saveo-ink-mid p-3.5 transition-transform hover:translate-x-1 rtl:hover:-translate-x-1"
              >
                {deal.product.images[0] && (
                  <Image
                    src={deal.product.images[0].url}
                    alt={name}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3] text-white">{name}</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[15px] font-extrabold text-saveo-primary">{formatKWD(dealPrice)}</span>
                    <span className="text-xs text-saveo-muted line-through">{formatKWD(Number(deal.product.saveoPrice))}</span>
                    <span className="text-[11px] font-extrabold text-saveo-accent">-{deal.discountPercent}%</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-saveo-muted">{remaining} {locale === "ar" ? "متبقي" : "left"}</p>
                </div>
              </Link>
            );
          })}
          <Link
            href="/products?type=DEAL"
            className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-3.5 text-[13px] font-semibold text-saveo-muted transition-colors hover:text-white"
          >
            {locale === "ar" ? "كل عروض الفلاش" : "View all flash deals"} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
        </div>
      </div>
    </section>
  );
}
