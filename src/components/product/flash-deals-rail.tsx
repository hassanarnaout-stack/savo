import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Zap } from "lucide-react";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { formatKWD } from "@/lib/utils";
import { CountdownTimer } from "@/components/product/countdown-timer";

export async function FlashDealsRail({ locale }: { locale: string }) {
  const deals = await FlashDealService.getAllLiveDeals(8);
  if (deals.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-saveo-emerald-800">
        <Zap className="h-5 w-5 text-saveo-gold-500" />
        {locale === "ar" ? "عروض سريعة" : "Flash Deals"}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deals.map((deal) => {
          const dealPrice = FlashDealService.effectivePrice(Number(deal.product.saveoPrice), deal.discountPercent);
          const remaining = FlashDealService.getRemainingStock(deal);
          const name = locale === "ar" && deal.product.nameAr ? deal.product.nameAr : deal.product.name;

          return (
            <Link key={deal.id} href={`/products/${deal.product.slug}`} className="rounded-xl2 border border-black/5 bg-white p-3 transition-shadow hover:shadow-md">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-black/5">
                {deal.product.images[0] && (
                  <Image src={deal.product.images[0].url} alt={name} fill className="object-cover" />
                )}
                <span className="absolute top-1.5 start-1.5 rounded-full bg-saveo-emerald-800 px-2 py-0.5 text-[10px] font-bold text-white">
                  -{deal.discountPercent}%
                </span>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-medium">{name}</p>
              <p className="font-bold text-saveo-emerald-700">{formatKWD(dealPrice)}</p>
              <p className="text-[11px] text-saveo-emerald-700/50">{remaining} left</p>
              <CountdownTimer dealEndsAt={deal.endAt} compact />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
