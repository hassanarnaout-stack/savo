import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatKWD } from "@/lib/utils";
import { OrderStatusUpdater } from "@/components/admin/order-status-updater";
import { SupplierOrderStatusBadge } from "@/components/order/supplier-order-status-badge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      address: true,
      user: { select: { name: true, email: true, phone: true } },
      history: { orderBy: { createdAt: "desc" } },
      supplierOrders: {
        include: {
          supplier: { select: { companyName: true, verificationStatus: true } },
          items: true,
        },
      },
    },
  });

  if (!order) notFound();

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-saveo-emerald-700/50">
            {order.user.name ?? order.user.email} · {new Date(order.createdAt).toLocaleString("en-GB")}
          </p>
        </div>
        <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Each supplier's slice of this order — independent status */}
          {order.supplierOrders.map((so) => (
            <div key={so.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">
                  {so.supplier.companyName}
                  {so.supplier.verificationStatus === "VERIFIED" && (
                    <span className="ms-1 text-xs text-saveo-emerald-600">✓ Verified</span>
                  )}
                </h2>
                <SupplierOrderStatusBadge status={so.status} />
              </div>
              <ul className="divide-y divide-black/5 text-sm">
                {so.items.map((item) => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span>{item.productName} × {item.quantity}</span>
                    <span className="font-semibold">{formatKWD(Number(item.lineTotal))}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-black/5 pt-2 text-xs text-saveo-emerald-700/50">
                <span>Supplier subtotal</span>
                <span>{formatKWD(Number(so.subtotal))}</span>
              </div>
              <div className="flex justify-between text-xs text-saveo-emerald-700/50">
                <span>Savo commission ({Number(so.commissionRate)}%)</span>
                <span>-{formatKWD(Number(so.commissionAmount))}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-saveo-emerald-700">
                <span>Supplier payout</span>
                <span>{formatKWD(Number(so.supplierPayout))}</span>
              </div>
            </div>
          ))}

          <div className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Order Summary</h2>
            <div className="space-y-1">
              <div className="flex justify-between text-saveo-emerald-700/60">
                <span>Subtotal</span>
                <span>{formatKWD(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-saveo-emerald-700/60">
                <span>Discount</span>
                <span className="text-saveo-emerald-600">-{formatKWD(Number(order.discountTotal))}</span>
              </div>
              <div className="flex justify-between text-saveo-emerald-700/60">
                <span>Delivery</span>
                <span>{formatKWD(Number(order.deliveryFee))}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatKWD(Number(order.total))}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {order.address && (
            <div className="card p-5 text-sm">
              <h2 className="mb-2 font-bold">Delivery Address</h2>
              <p>{order.address.fullName}</p>
              <p className="text-saveo-emerald-700/60">{order.address.phone}</p>
              <p className="text-saveo-emerald-700/60">
                {order.address.governorate}, {order.address.area}
                {order.address.block ? `, Block ${order.address.block}` : ""}
              </p>
              {order.address.notes && <p className="mt-2 italic text-saveo-emerald-700/50">"{order.address.notes}"</p>}
            </div>
          )}

          <div className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Order Status History</h2>
            <ul className="space-y-2">
              {order.history.map((h) => (
                <li key={h.id} className="text-xs text-saveo-emerald-700/60">
                  <span className="font-semibold text-saveo-emerald-700">{h.status}</span> —{" "}
                  {new Date(h.createdAt).toLocaleString("en-GB")}
                  {h.note && <p className="italic">{h.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
