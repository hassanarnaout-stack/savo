import { prisma } from "@/lib/prisma";
import { GoodsReceiptService } from "@/lib/services/goods-receipt-service";
import { formatKWD } from "@/lib/utils";
import { CreateReceiptForm, ReceiptStatusControls } from "@/components/admin/goods-receipt-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminReceivingPage() {
  const [receipts, suppliers, products] = await Promise.all([
    GoodsReceiptService.getAll(),
    prisma.supplier.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Commerce ERP" }, { label: "Receiving" }]} />
      <h1 className="mb-6 text-2xl font-bold">Goods Receiving</h1>

      <div className="mb-6">
        <CreateReceiptForm suppliers={suppliers} products={products} />
      </div>

      <div className="space-y-3">
        {receipts.map((r) => (
          <div key={r.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{r.referenceNumber} · {r.supplier.companyName}</p>
                <p className="text-xs text-saveo-emerald-700/50">
                  {r.items.length} items · {new Date(r.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
              <ReceiptStatusControls receiptId={r.id} status={r.status} />
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-saveo-emerald-700/60">
              {r.items.map((item) => (
                <p key={item.id}>{item.product.name} × {item.quantity} @ {formatKWD(Number(item.costPrice))}</p>
              ))}
            </div>
          </div>
        ))}
        {receipts.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No goods receipts yet.
          </div>
        )}
      </div>
    </div>
  );
}
