import { prisma } from "@/lib/prisma";
import { PurchaseOrderService } from "@/lib/services/purchase-order-service";
import { formatKWD } from "@/lib/utils";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { CreatePOForm, POStatusButtons, ReceivePOButton } from "@/components/admin/purchase-order-controls";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-black/5 text-saveo-emerald-700/60",
  SENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
  RECEIVED: "bg-saveo-emerald-100 text-saveo-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function PurchaseOrdersPage() {
  const [purchaseOrders, suppliers, products] = await Promise.all([
    PurchaseOrderService.getAll(),
    prisma.supplier.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Purchase Orders" }]} />
      <h1 className="mb-1 text-2xl font-bold">Purchase Orders</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        The request sent to a supplier — distinct from Goods Receipt, which records what actually arrives. Receiving a PO creates a real Goods Receipt and updates stock through the existing receiving flow.
      </p>

      <div className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">New Purchase Order</h2>
        <CreatePOForm suppliers={suppliers} products={products} />
      </div>

      <div className="space-y-3">
        {purchaseOrders.map((po) => (
          <div key={po.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{po.referenceNumber} — {po.supplier.companyName}</p>
                <p className="text-xs text-saveo-emerald-700/50">{new Date(po.createdAt).toLocaleDateString("en-GB")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[po.status]}`}>{po.status.replace(/_/g, " ")}</span>
                <POStatusButtons poId={po.id} status={po.status} />
              </div>
            </div>
            <div className="mb-2 space-y-1 text-sm text-saveo-emerald-700/70">
              {po.items.map((item) => (
                <p key={item.id}>{item.quantityOrdered}× {item.product.name} @ {formatKWD(Number(item.unitCost))}</p>
              ))}
            </div>
            {(po.status === "CONFIRMED" || po.status === "PARTIALLY_RECEIVED") && (
              <ReceivePOButton poId={po.id} items={po.items.map((i) => ({ productId: i.productId, name: i.product.name, quantityOrdered: i.quantityOrdered }))} />
            )}
          </div>
        ))}
        {purchaseOrders.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No purchase orders yet.
          </div>
        )}
      </div>
    </div>
  );
}
