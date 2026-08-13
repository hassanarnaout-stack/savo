import Link from "next/link";
import { MembershipService } from "@/lib/services/membership-service";
import { formatKWD } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminMembershipMembersPage({ searchParams }: Props) {
  const { status, page } = await searchParams;
  const activeTab = status === "expired" ? "expired" : "active";
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const { members, total } =
    activeTab === "active"
      ? await MembershipService.getActiveMembers(currentPage)
      : await MembershipService.getExpiredMembers(currentPage);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Members</h1>

      <div className="mb-4 flex gap-2">
        <Link
          href="/admin/membership/members?status=active"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            activeTab === "active" ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
          }`}
        >
          Active
        </Link>
        <Link
          href="/admin/membership/members?status=expired"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            activeTab === "expired" ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
          }`}
        >
          Expired / Cancelled
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">{activeTab === "active" ? "Renews" : "Ended"}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{m.user.name ?? "—"}</p>
                  <p className="text-xs text-saveo-emerald-700/50">{m.user.email}</p>
                </td>
                <td className="px-4 py-3">{m.plan.name}</td>
                <td className="px-4 py-3">{m.pricingOption.billingCycle}</td>
                <td className="px-4 py-3">{formatKWD(Number(m.pricingOption.price))}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      m.status === "ACTIVE"
                        ? "bg-saveo-emerald-100 text-saveo-emerald-800"
                        : m.status === "CANCELLED"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">
                  {new Date(m.endsAt).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-saveo-emerald-700/40">
                  No {activeTab} members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-saveo-emerald-700/40">{total} total {activeTab} members</p>
    </div>
  );
}
