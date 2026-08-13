import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";

export default async function AdminInventoryReportsPage() {
  const now = new Date();

  const [slowMoving, expiredProducts, damagedProducts, valuationProducts] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", stockQty: { gt: 5 } },
      orderBy: { soldQuantity: "asc" },
      take: 15,
      select: { id: true, name: true, stockQty: true, soldQuantity: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { expiryDate: { lt: now }, stockQty: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
      select: { id: true, name: true, stockQty: true, expiryDate: true },
    }),
    prisma.product.findMany({
      where: { damagedQuantity: { gt: 0 } },
      orderBy: { damagedQuantity: "desc" },
      select: { id: true, name: true, damagedQuantity: true },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", stockQty: { gt: 0 } },
      select: { stockQty: true, purchaseCost: true, saveoPrice: true },
    }),
  ]);

  const costValue = valuationProducts.reduce((sum, p) => sum + (p.purchaseCost ? p.stockQty * Number(p.purchaseCost) : 0), 0);
  const retailValue = valuationProducts.reduce((sum, p) => sum + p.stockQty * Number(p.saveoPrice), 0);
  const productsWithCostData = valuationProducts.filter((p) => p.purchaseCost !== null).length;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Inventory Reports</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl2 border border-black/5 bg-white p-5">
          <p className="text-xs text-saveo-emerald-700/50">Inventory Value (Cost)</p>
          <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(costValue)}</p>
          <p className="text-xs text-saveo-emerald-700/40">{productsWithCostData} products have cost data entered</p>
        </div>
        <div className="rounded-xl2 border border-black/5 bg-white p-5">
          <p className="text-xs text-saveo-emerald-700/50">Inventory Value (Retail)</p>
          <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(retailValue)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl2 border border-black/5 bg-white p-5">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">🐢 Slow Moving</h2>
          <div className="space-y-2 text-sm">
            {slowMoving.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-saveo-emerald-700/50">{p.soldQuantity} sold / {p.stockQty} in stock</span>
              </div>
            ))}
            {slowMoving.length === 0 && <p className="text-saveo-emerald-700/40">Nothing here.</p>}
          </div>
        </section>

        <section className="rounded-xl2 border border-red-100 bg-red-50/30 p-5">
          <h2 className="mb-3 font-bold text-red-700">⏰ Expired (still in stock)</h2>
          <div className="space-y-2 text-sm">
            {expiredProducts.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-red-600">{p.stockQty} units · {p.expiryDate?.toLocaleDateString("en-GB")}</span>
              </div>
            ))}
            {expiredProducts.length === 0 && <p className="text-saveo-emerald-700/40">No expired stock. 🎉</p>}
          </div>
        </section>

        <section className="rounded-xl2 border border-amber-100 bg-amber-50/30 p-5">
          <h2 className="mb-3 font-bold text-amber-700">💥 Damaged</h2>
          <div className="space-y-2 text-sm">
            {damagedProducts.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-amber-700">{p.damagedQuantity} units</span>
              </div>
            ))}
            {damagedProducts.length === 0 && <p className="text-saveo-emerald-700/40">No damage recorded.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
