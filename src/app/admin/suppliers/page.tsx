import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STATUSES = ["ALL", "PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminSuppliersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const activeStatus = status && STATUSES.includes(status) ? status : "ALL";

  const suppliers = await prisma.supplier.findMany({
    where: activeStatus === "ALL" ? {} : { status: activeStatus as any },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Suppliers</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/suppliers" : `/admin/suppliers?status=${s}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              activeStatus === s ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
            }`}
          >
            {s}
            {s === "PENDING" && (
              <span className="ms-1 rounded-full bg-saveo-gold-400 px-1.5 text-saveo-emerald-900">
                {suppliers.filter((s2) => s2.status === "PENDING").length || ""}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{s.companyName}</td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">
                  {s.contactName}
                  <br />
                  <span className="text-xs">{s.email}</span>
                </td>
                <td className="px-4 py-3">{s._count.products}</td>
                <td className="px-4 py-3">{Number(s.commissionRate)}%</td>
                <td className="px-4 py-3">
                  <StatusPill value={s.status} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill value={s.verificationStatus} />
                </td>
                <td className="px-4 py-3 text-saveo-emerald-700/50">
                  {new Date(s.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 text-end">
                  <Link href={`/admin/suppliers/${s.id}`} className="text-xs font-semibold text-saveo-emerald-600">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-saveo-emerald-700/40">
                  No suppliers in this status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PILL_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-saveo-emerald-100 text-saveo-emerald-800",
  SUSPENDED: "bg-orange-100 text-orange-700",
  REJECTED: "bg-red-100 text-red-700",
  UNVERIFIED: "bg-black/5 text-saveo-emerald-700/60",
  VERIFIED: "bg-saveo-emerald-100 text-saveo-emerald-800",
};

function StatusPill({ value }: { value: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${PILL_STYLES[value] ?? "bg-black/5"}`}>
      {value}
    </span>
  );
}
