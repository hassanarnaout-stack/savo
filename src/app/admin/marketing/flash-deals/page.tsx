import { prisma } from "@/lib/prisma";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { formatKWD } from "@/lib/utils";
import { CreateFlashDealForm, FlashDealControls } from "@/components/admin/flash-deal-controls";

export default async function AdminFlashDealsPage() {
  const [deals, products] = await Promise.all([
    FlashDealService.getAll(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Flash Deals</h1>

      <div className="mb-6">
        <CreateFlashDealForm products={products} />
      </div>

      <div className="space-y-3">
        {deals.map((deal) => {
          const remaining = FlashDealService.getRemainingStock(deal);
          const dealPrice = FlashDealService.effectivePrice(Number(deal.product.saveoPrice), deal.discountPercent);
          return (
            <div key={deal.id} className="rounded-xl2 border border-black/5 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {deal.product.images[0] && (
                    <img src={deal.product.images[0].url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="font-semibold">{deal.product.name}</p>
                    <p className="text-xs text-saveo-emerald-700/50">
                      {deal.discountPercent}% off → {formatKWD(dealPrice)} · {remaining}/{deal.stockLimit} left ·{" "}
                      {new Date(deal.startAt).toLocaleDateString("en-GB")} - {new Date(deal.endAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
                <FlashDealControls dealId={deal.id} status={deal.status} />
              </div>
              <div className="mt-3 flex gap-4 border-t border-black/5 pt-2 text-xs text-saveo-emerald-700/50">
                <span>👁️ {deal.viewCount} views</span>
                <span>🛒 {deal.buyerCount} buyers</span>
              </div>
            </div>
          );
        })}
        {deals.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No flash deals yet.
          </div>
        )}
      </div>
    </div>
  );
}
