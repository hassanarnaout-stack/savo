import { prisma } from "@/lib/prisma";
import { AuctionService } from "@/lib/services/auction-service";
import { formatKWD } from "@/lib/utils";
import { CreateAuctionForm, AuctionEnableToggle } from "@/components/admin/auction-controls";

export default async function AdminAuctionsPage() {
  const [auctions, products] = await Promise.all([
    AuctionService.getAll(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-2 text-2xl font-bold">Auctions</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Every new auction starts <strong>disabled</strong> — nothing goes live to customers until you explicitly enable it.
      </p>

      <div className="mb-6">
        <CreateAuctionForm products={products} />
      </div>

      <div className="space-y-3">
        {auctions.map((auction) => (
          <div key={auction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-black/5 bg-white p-4">
            <div>
              <p className="font-semibold">{auction.product.name}</p>
              <p className="text-xs text-saveo-emerald-700/50">
                {formatKWD(Number(auction.startingPrice))} start · +{formatKWD(Number(auction.minIncrement))} min ·{" "}
                {auction._count.bids} bids · {auction.status}
                {auction.winnerId && ` · Won at ${formatKWD(Number(auction.winningBid))}`}
              </p>
            </div>
            <AuctionEnableToggle auctionId={auction.id} isEnabled={auction.isEnabled} />
          </div>
        ))}
        {auctions.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No auctions yet.
          </div>
        )}
      </div>
    </div>
  );
}
