import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { IssueStatusActions } from "@/components/admin/issue-status-actions";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminSupportPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const activeTab = status === "all" ? "all" : status === "resolved" ? "RESOLVED" : "open"; // default: open + processing

  const openStatuses: ("OPEN" | "PROCESSING")[] = ["OPEN", "PROCESSING"];
  const where =
    activeTab === "all"
      ? {}
      : activeTab === "RESOLVED"
      ? { status: "RESOLVED" as const }
      : { status: { in: openStatuses } };

  const issues = await prisma.orderIssue.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } }, order: { select: { orderNumber: true } } },
    take: 100,
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Customer Support</h1>

      <div className="mb-4 flex gap-2">
        <Link href="/admin/support" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${activeTab === "open" ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
          Open & Processing
        </Link>
        <Link href="/admin/support?status=resolved" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${activeTab === "RESOLVED" ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
          Resolved
        </Link>
        <Link href="/admin/support?status=all" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${activeTab === "all" ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
          All
        </Link>
      </div>

      <div className="space-y-3">
        {issues.map((issue) => (
          <div key={issue.id} className="rounded-xl2 border border-black/5 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">{issue.subject}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      issue.status === "OPEN"
                        ? "bg-red-100 text-red-700"
                        : issue.status === "PROCESSING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-saveo-emerald-100 text-saveo-emerald-800"
                    }`}
                  >
                    {issue.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-saveo-emerald-700/50">
                  {issue.order.orderNumber} · {issue.user.name ?? issue.user.email} · {new Date(issue.createdAt).toLocaleString("en-GB")}
                </p>
                <p className="mt-2 max-w-xl text-sm text-saveo-emerald-700/80">{issue.description}</p>
                {issue.adminNotes && (
                  <p className="mt-2 rounded-lg bg-black/[0.03] p-2 text-xs text-saveo-emerald-700/60">
                    <strong>Admin notes:</strong> {issue.adminNotes}
                  </p>
                )}
              </div>
              <IssueStatusActions issueId={issue.id} currentStatus={issue.status} />
            </div>
          </div>
        ))}
        {issues.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No issues here. 🎉
          </div>
        )}
      </div>
    </div>
  );
}
