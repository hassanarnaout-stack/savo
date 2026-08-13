import { prisma } from "@/lib/prisma";
import { CreateAutomationForm, AutomationToggle, RunScanButton } from "@/components/admin/automation-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminAutomationsPage() {
  const automations = await prisma.marketingAutomation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { executions: true } } },
  });

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Marketing Automation" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketing Automation</h1>
        <RunScanButton />
      </div>

      <div className="mb-6 card p-5">
        <CreateAutomationForm />
      </div>

      <div className="space-y-2">
        {automations.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl2 border border-black/5 bg-white p-4 text-sm">
            <div>
              <p className="font-semibold">{a.name}</p>
              <p className="text-xs text-saveo-emerald-700/50">
                {a.trigger.replace(/_/g, " ")} → {a.action} · {a._count.executions} execution(s)
              </p>
            </div>
            <AutomationToggle automationId={a.id} active={a.active} />
          </div>
        ))}
        {automations.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No automations yet.
          </div>
        )}
      </div>
    </div>
  );
}
