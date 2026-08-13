import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminDamagedPage() {
  const damagedProducts = await prisma.product.findMany({
    where: { damagedQuantity: { gt: 0 } },
    orderBy: { damagedQuantity: "desc" },
    select: { id: true, name: true, damagedQuantity: true, purchaseCost: true },
  });

  const totalLoss = damagedProducts.reduce((sum, p) => sum + p.damagedQuantity * Number(p.purchaseCost ?? 0), 0);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Commerce ERP" }, { label: "Damaged" }]} />
      <h1 className="mb-2 text-2xl font-bold">Damaged &amp; Loss Management</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Total loss value (damaged units × cost price): <strong className="text-red-600">{formatKWD(totalLoss)}</strong>
      </p>

      <div className="space-y-2">
        {damagedProducts.map((p) => {
          const lossValue = p.damagedQuantity * Number(p.purchaseCost ?? 0);
          return (
            <div key={p.id} className="flex items-center justify-between rounded-xl2 border border-red-100 bg-red-50/40 p-4 text-sm">
              <span>{p.name}</span>
              <span className="font-semibold text-red-700">{p.damagedQuantity} units · {formatKWD(lossValue)} lost</span>
            </div>
          );
        })}
        {damagedProducts.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No damaged inventory recorded. 🎉
          </div>
        )}
      </div>
    </div>
  );
}
