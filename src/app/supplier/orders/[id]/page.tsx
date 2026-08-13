import { redirect, notFound } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { getValidNextStatuses } from "@/lib/supplier-orders";
import { SupplierOrderStatusBadge } from "@/components/order/supplier-order-status-badge";
import { SupplierOrderActions } from "@/components/supplier/order-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SupplierOrderDetailPage({ params }: Props) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/orders");
      case "WRONG_ROLE":
        redirect("/");
      case "NO_SUPPLIER_PROFILE":
        redirect("/supplier/register");
      case "PENDING":
        redirect("/supplier/pending");
      case "REJECTED":
        redirect("/supplier/rejected");
      case "SUSPENDED":
        redirect("/supplier/suspended");
    }
  }
  const { supplier } = gate;

  const { id } = await params;

  const supplierOrder = await prisma.supplierOrder.findUnique({
    where: { id },
    include: {
      items: true,
      history: { orderBy: { createdAt: "desc" } },
      order: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
          address: true,
        },
      },
    },
  });

  // SECURITY: 404 (not 403) if this SupplierOrder doesn't exist OR belongs
  // to a different supplier.
  if (!supplierOrder || supplierOrder.supplierId !== supplier.id) notFound();

  const nextStatuses = getValidNextStatuses(supplierOrder.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-saveo-emerald-700">
            {supplierOrder.supplierOrderNumber ?? supplierOrder.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-saveo-emerald-700/50">
            Part of order {supplierOrder.order.orderNumber} · {new Date(supplierOrder.createdAt).toLocaleString("en-GB")}
          </p>
        </div>
        <SupplierOrderStatusBadge status={supplierOrder.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-bold text-saveo-emerald-700">Items</h2>
            <ul className="divide-y divide-black/5 text-sm">
              {supplierOrder.items.map((item) => (
                <li key={item.id} className="flex justify-between py-2">
                  <span>{item.productName} × {item.quantity}</span>
                  <span className="font-semibold">{formatKWD(Number(item.lineTotal))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-black/5 pt-3 text-base font-bold">
              <span>Your subtotal</span>
              <span>{formatKWD(Number(supplierOrder.subtotal))}</span>
            </div>
          </section>

          {supplierOrder.order.address?.notes && (
            <section className="card p-5">
              <h2 className="mb-2 font-bold text-saveo-emerald-700">Delivery Notes</h2>
              <p className="text-sm italic text-saveo-emerald-700/70">"{supplierOrder.order.address.notes}"</p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 font-bold text-saveo-emerald-700">Status Timeline</h2>
            <ul className="space-y-3">
              {supplierOrder.history.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="font-semibold text-saveo-emerald-700">{h.status}</span>
                  {h.previousStatus && <span className="text-saveo-emerald-700/40"> (from {h.previousStatus})</span>}
                  <span className="ms-2 text-xs text-saveo-emerald-700/50">
                    {new Date(h.createdAt).toLocaleString("en-GB")}
                  </span>
                  {h.note && <p className="text-xs italic text-saveo-emerald-700/50">{h.note}</p>}
                </li>
              ))}
            </ul>
          </section>

          {nextStatuses.length > 0 && (
            <SupplierOrderActions supplierOrderId={supplierOrder.id} nextStatuses={nextStatuses} />
          )}
        </div>

        <div className="space-y-4">
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-bold text-saveo-emerald-700">Customer</h2>
            <p>{supplierOrder.order.user.name ?? "—"}</p>
            <p className="text-saveo-emerald-700/60">{supplierOrder.order.user.email}</p>
            {supplierOrder.order.user.phone && <p className="text-saveo-emerald-700/60">{supplierOrder.order.user.phone}</p>}
          </section>

          {supplierOrder.order.address && (
            <section className="card p-5 text-sm">
              <h2 className="mb-2 font-bold text-saveo-emerald-700">Delivery Address</h2>
              <p>{supplierOrder.order.address.fullName}</p>
              <p className="text-saveo-emerald-700/60">{supplierOrder.order.address.phone}</p>
              <p className="text-saveo-emerald-700/60">
                {supplierOrder.order.address.governorate}, {supplierOrder.order.address.area}
                {supplierOrder.order.address.block ? `, Block ${supplierOrder.order.address.block}` : ""}
                {supplierOrder.order.address.street ? `, ${supplierOrder.order.address.street}` : ""}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
