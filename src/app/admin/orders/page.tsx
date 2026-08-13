import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatKWD } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { SortableHeader } from "@/components/admin/sortable-header";
import { parseSortParams } from "@/lib/sort-params";

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "PREPARING", "DELIVERED", "CANCELLED"];
const SORTABLE_FIELDS = ["createdAt", "total", "status"];

interface Props {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string; supplier?: string; dateFrom?: string; dateTo?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status, sort, dir, supplier, dateFrom, dateTo } = await searchParams;
  const activeStatus = status && STATUSES.includes(status) ? status : "ALL";
  const { field, dir: sortDir } = parseSortParams({ sort, dir }, SORTABLE_FIELDS, "createdAt", "desc");

  const suppliers = await prisma.supplier.findMany({
    where: { verificationStatus: "VERIFIED" },
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });

  const orders = await prisma.order.findMany({
    where: {
      ...(activeStatus === "ALL" ? {} : { status: activeStatus as any }),
      ...(supplier ? { supplierOrders: { some: { supplierId: supplier } } } : {}),
      ...(dateFrom || dateTo
        ? { createdAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } }
        : {}),
    },
    orderBy: { [field]: sortDir },
    include: {
      user: { select: { name: true, email: true } },
      supplierOrders: { include: { items: true, supplier: { select: { companyName: true } } } },
    },
    take: 100,
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Orders</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/orders" : `/admin/orders?status=${s}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              activeStatus === s ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="status" value={activeStatus === "ALL" ? "" : activeStatus} />
        <select name="supplier" defaultValue={supplier ?? ""} className="input text-sm">
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.companyName}</option>
          ))}
        </select>
        <input type="date" name="dateFrom" defaultValue={dateFrom} className="input text-sm" title="From" />
        <input type="date" name="dateTo" defaultValue={dateTo} className="input text-sm" title="To" />
        <button type="submit" className="btn-outline text-sm">Apply</button>
      </form>

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Suppliers</th>
              <th className="px-4 py-3"><SortableHeader field="total" label="Total" /></th>
              <th className="px-4 py-3"><SortableHeader field="status" label="Status" /></th>
              <th className="px-4 py-3"><SortableHeader field="createdAt" label="Date" /></th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">{o.user.name ?? o.user.email}</td>
                <td className="px-4 py-3">{o.supplierOrders.reduce((n, so) => n + so.items.length, 0)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {o.supplierOrders.map((so) => (
                      <span key={so.id} className="rounded-full bg-saveo-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-saveo-emerald-700">
                        {so.supplier.companyName}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">{formatKWD(Number(o.total))}</td>
                <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-saveo-emerald-700/50">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-xs font-semibold text-saveo-emerald-600">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
