import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { Download } from "lucide-react";

const PAGE_SIZE = 25;
const STATUSES = ["ALL", "PENDING", "COMPLETED", "SETTLED", "REVERSED"];

interface Props {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string; page?: string }>;
}

export default async function SupplierReportsPage({ searchParams }: Props) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/reports");
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

  // SECURITY: supplierId always the signed-in supplier's own id.
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
          supplierOrder: {
            OR: [
              { supplierOrderNumber: { contains: q, mode: "insensitive" as const } },
              { order: { orderNumber: { contains: q, mode: "insensitive" as const } } },
            ],
          },
        }
      : {}),
  };

  const [transactions, totalCount, totals] = await Promise.all([
    prisma.supplierTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        saleAmount: true,
        commissionAmount: true,
        supplierAmount: true,
        status: true,
        createdAt: true,
        supplierOrder: { select: { supplierOrderNumber: true, order: { select: { orderNumber: true } } } },
      },
    }),
    prisma.supplierTransaction.count({ where }),
    // Per the GMV vs Realized Sales distinction (see supplier-analytics.ts):
    // these summary cards must represent REALIZED money — orders that were
    // actually DELIVERED (COMPLETED or SETTLED) — never PENDING (not yet
    // delivered) or REVERSED (cancelled), even when the table below shows
    // "All" for full transparency. If the supplier explicitly filters to a
    // specific status, we honor that and total exactly what they asked for.
    prisma.supplierTransaction.aggregate({
      where: activeStatus === "ALL" ? { ...where, status: { in: ["COMPLETED", "SETTLED"] } } : where,
      _sum: { saleAmount: true, commissionAmount: true, supplierAmount: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const exportParams = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(activeStatus !== "ALL" ? { status: activeStatus } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-saveo-emerald-700">Financial Reports</h1>
          <p className="text-sm text-saveo-emerald-700/50">{totalCount} transactions</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/supplier/reports/export?format=csv&${exportParams}`} className="btn-outline text-sm">
            <Download className="h-4 w-4" /> CSV
          </a>
          <a href={`/api/supplier/reports/export?format=xlsx&${exportParams}`} className="btn-outline text-sm">
            <Download className="h-4 w-4" /> Excel
          </a>
        </div>
      </div>

      <div className="mb-2 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-saveo-emerald-700/50">Realized Sales</p>
          <p className="mt-1 text-lg font-extrabold text-saveo-emerald-700">{formatKWD(Number(totals._sum.saleAmount ?? 0))}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-saveo-emerald-700/50">Total Commission</p>
          <p className="mt-1 text-lg font-extrabold text-amber-600">{formatKWD(Number(totals._sum.commissionAmount ?? 0))}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-saveo-emerald-700/50">Net Payable</p>
          <p className="mt-1 text-lg font-extrabold text-saveo-emerald-700">{formatKWD(Number(totals._sum.supplierAmount ?? 0))}</p>
        </div>
      </div>
      <p className="mb-6 text-xs text-saveo-emerald-700/40">
        {activeStatus === "ALL"
          ? "Totals reflect Realized Sales (delivered orders only) — pending and reversed transactions are shown in the table below but excluded from these figures. For total order activity including undelivered orders, see GMV on your Dashboard."
          : `Showing totals for ${activeStatus.toLowerCase()} transactions only.`}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/supplier/reports${s === "ALL" ? "" : `?status=${s}`}`}
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
        <input
          name="q"
          defaultValue={q}
          placeholder="Search order #..."
          className="min-w-[200px] flex-1 rounded-full border border-black/10 px-4 py-2 text-sm"
        />
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
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Sale Amount</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Net Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 text-saveo-emerald-700/60">{new Date(t.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 font-medium">{t.supplierOrder.supplierOrderNumber ?? "—"}</td>
                <td className="px-4 py-3">{formatKWD(Number(t.saleAmount))}</td>
                <td className="px-4 py-3 text-amber-600">-{formatKWD(Number(t.commissionAmount))}</td>
                <td className="px-4 py-3 font-semibold">{formatKWD(Number(t.supplierAmount))}</td>
                <td className="px-4 py-3">
                  <StatusPill status={t.status} />
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-saveo-emerald-700/40">
                  No transactions match your filters.
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
              href={`/supplier/reports?${new URLSearchParams({
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

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-saveo-gold-100 text-saveo-gold-700",
  SETTLED: "bg-saveo-emerald-100 text-saveo-emerald-800",
  REVERSED: "bg-red-100 text-red-700",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[status] ?? "bg-black/5"}`}>
      {status}
    </span>
  );
}
