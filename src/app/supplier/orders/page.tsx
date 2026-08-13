import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { Search } from "lucide-react";
import { SupplierOrderStatusBadge } from "@/components/order/supplier-order-status-badge";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>;
}

const STATUSES = ["ALL", "PENDING", "ACCEPTED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENT_STYLES: Record<string, string> = {
  PAID: "bg-saveo-emerald-100 text-saveo-emerald-800",
  UNPAID: "bg-amber-100 text-amber-700",
  REFUNDED: "bg-black/5 text-saveo-emerald-700/60",
  FAILED: "bg-red-100 text-red-700",
};

export default async function SupplierOrdersPage({ searchParams }: Props) {
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

  const { q, status, from, to, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const activeStatus = status && STATUSES.includes(status) ? status : "ALL";

  // SECURITY: supplierId is always this signed-in supplier's own id — the
  // single boundary guaranteeing a supplier only ever sees their own orders.
  const where = {
    supplierId: supplier.id,
    ...(activeStatus !== "ALL" ? { status: activeStatus as any } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { supplierOrderNumber: { contains: q, mode: "insensitive" as const } },
            { order: { orderNumber: { contains: q, mode: "insensitive" as const } } },
            { order: { user: { name: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.supplierOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        supplierOrderNumber: true,
        status: true,
        subtotal: true,
        createdAt: true,
        order: { select: { orderNumber: true, paymentStatus: true, user: { select: { name: true, email: true } } } },
        _count: { select: { items: true } },
      },
    }),
    prisma.supplierOrder.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-saveo-emerald-700">Orders</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">{totalCount} orders for your products</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/supplier/orders${s === "ALL" ? "" : `?status=${s}`}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              activeStatus === s ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="status" value={activeStatus === "ALL" ? "" : activeStatus} />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saveo-emerald-700/40" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search order # or customer..."
            className="w-full rounded-full border border-black/10 py-2 ps-9 pe-4 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">From</label>
          <input type="date" name="from" defaultValue={from} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">To</label>
          <input type="date" name="to" defaultValue={to} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" className="btn-outline !py-2 text-sm">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Parent Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{o.supplierOrderNumber ?? o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">{o.order.orderNumber}</td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">{o.order.user.name ?? o.order.user.email}</td>
                <td className="px-4 py-3 text-saveo-emerald-700/50">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">{o._count.items}</td>
                <td className="px-4 py-3 font-semibold">{formatKWD(Number(o.subtotal))}</td>
                <td className="px-4 py-3"><SupplierOrderStatusBadge status={o.status} /></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${PAYMENT_STYLES[o.order.paymentStatus] ?? "bg-black/5"}`}>
                    {o.order.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-end">
                  <Link href={`/supplier/orders/${o.id}`} className="text-xs font-semibold text-saveo-emerald-600">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-saveo-emerald-700/40">
                  No orders match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/supplier/orders?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(activeStatus !== "ALL" ? { status: activeStatus } : {}),
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
                page: String(p),
              })}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                p === currentPage ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
