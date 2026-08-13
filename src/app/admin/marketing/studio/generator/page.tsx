import { prisma } from "@/lib/prisma";
import { AdContentGeneratorForm } from "@/components/admin/ad-content-generator-form";
import { AdContentGeneratorService } from "@/lib/services/ad-content-generator-service";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdContentGeneratorPage() {
  const [products, categories, history] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    AdContentGeneratorService.getHistory(),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Marketing Studio", href: "/admin/marketing/studio" }, { label: "Ad Content Generator" }]} />
      <h1 className="mb-6 text-2xl font-bold">Ad Content Generator</h1>

      <AdContentGeneratorForm products={products} categories={categories} />

      <h2 className="mb-3 mt-8 font-bold text-saveo-emerald-700">Previously Generated ({history.length})</h2>
      <div className="space-y-2">
        {history.slice(0, 20).map((h) => (
          <div key={h.id} className="rounded-xl2 border border-black/5 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{h.headline}</p>
              <span className="text-xs text-saveo-emerald-700/40">{h.platform} · {h.tone}</span>
            </div>
            <p className="text-xs text-saveo-emerald-700/50">{h.product?.name ?? h.category?.name ?? "—"}</p>
          </div>
        ))}
        {history.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No ad content generated yet.</p>}
      </div>
    </div>
  );
}
