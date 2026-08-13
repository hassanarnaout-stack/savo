import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminExpiryPage() {
  const now = new Date();
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
  const in60 = new Date(now); in60.setDate(in60.getDate() + 60);

  const [expired, expiring30, expiring60] = await Promise.all([
    prisma.product.findMany({ where: { expiryDate: { lt: now }, stockQty: { gt: 0 } }, orderBy: { expiryDate: "asc" }, select: { id: true, name: true, stockQty: true, expiryDate: true } }),
    prisma.product.findMany({ where: { expiryDate: { gte: now, lt: in30 }, stockQty: { gt: 0 } }, orderBy: { expiryDate: "asc" }, select: { id: true, name: true, stockQty: true, expiryDate: true } }),
    prisma.product.findMany({ where: { expiryDate: { gte: in30, lt: in60 }, stockQty: { gt: 0 } }, orderBy: { expiryDate: "asc" }, select: { id: true, name: true, stockQty: true, expiryDate: true } }),
  ]);

  function Bucket({ title, items, tone }: { title: string; items: typeof expired; tone: string }) {
    return (
      <section className={`card p-5 ${tone}`}>
        <h2 className="mb-3 font-bold">{title} ({items.length})</h2>
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span>{p.name} · {p.stockQty} units</span>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60">{p.expiryDate?.toLocaleDateString("en-GB")}</span>
                <a href={`/admin/marketing/flash-deals?productId=${p.id}`} className="text-xs font-semibold underline">Flash Deal</a>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm opacity-50">Nothing here.</p>}
        </div>
      </section>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Commerce ERP" }, { label: "Expiry" }]} />
      <h1 className="mb-6 text-2xl font-bold">Expiry Management</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Bucket title="⏰ Expired" items={expired} tone="border-red-200 bg-red-50 text-red-800" />
        <Bucket title="🟠 Expiring — 30 Days" items={expiring30} tone="border-amber-200 bg-amber-50 text-amber-800" />
        <Bucket title="🟡 Expiring — 60 Days" items={expiring60} tone="border-yellow-200 bg-yellow-50 text-yellow-800" />
      </div>
    </div>
  );
}
