import Link from "next/link";
import Image from "next/image";
import { SponsoredSlotService } from "@/lib/services/sponsored-slot-service";
import { formatKWD } from "@/lib/utils";

export async function SponsoredProductsRail({ placementType, locale }: { placementType: string; locale: string }) {
  const slots = await SponsoredSlotService.getLiveSlots(placementType);
  if (slots.length === 0) return null;

  for (const slot of slots) {
    SponsoredSlotService.recordImpression(slot.id, slot.brandId);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase text-saveo-emerald-700/40">
        {locale === "ar" ? "منتجات مُموَّلة" : "Sponsored"}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slots.map((slot) => (
          <Link
            key={slot.id}
            href={`/${locale}/products/${slot.product.slug}?sponsored=${slot.id}`}
            className="rounded-xl2 border border-black/5 bg-white p-3 transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-black/5">
              {slot.product.images[0] && (
                <Image src={slot.product.images[0].url} alt={slot.product.name} fill className="object-cover" />
              )}
              <span className="absolute top-1.5 start-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white">
                {locale === "ar" ? "إعلان" : "Ad"}
              </span>
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-medium">{slot.product.name}</p>
            <p className="font-bold text-saveo-emerald-700">{formatKWD(Number(slot.product.saveoPrice))}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
