import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { ReturnRequestControls } from "@/components/admin/return-request-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminReturnRequestsPage() {
  const returns = await prisma.returnRequest.findMany({
    where: { status: "REQUESTED" },
    orderBy: { createdAt: "asc" },
    include: { order: { select: { orderNumber: true, total: true } }, user: { select: { name: true, email: true } } },
  });

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Return Requests" }]} />
      <h1 className="mb-2 text-2xl font-bold">Return Requests</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">{returns.length} request(s) awaiting review.</p>

      <div className="space-y-3">
        {returns.map((r) => (
          <div key={r.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.order.orderNumber} · {formatKWD(Number(r.order.total))}</p>
                <p className="text-xs text-saveo-emerald-700/50">{r.user.name ?? r.user.email} · {new Date(r.createdAt).toLocaleDateString("en-GB")}</p>
              </div>
              <ReturnRequestControls returnRequestId={r.id} />
            </div>
            <p className="text-sm text-saveo-emerald-700/70">{r.reason}</p>
            {r.images.length > 0 && (
              <div className="mt-2 flex gap-2">
                {r.images.map((url, i) => (
                  <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}
        {returns.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No pending return requests.
          </div>
        )}
      </div>
    </div>
  );
}
