import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ExperienceControls } from "@/components/admin/experience-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminProductExperiencePage() {
  const products = await prisma.product.findMany({
    where: { OR: [{ productStory: { not: null } }, { originStory: { not: null } }, { experienceType: { not: "STANDARD" } }] },
    select: {
      id: true, name: true, experienceType: true, experienceApproved: true, discoveryScore: true,
      productStory: true, originStory: true, supplier: { select: { companyName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const pendingApproval = products.filter((p) => !p.experienceApproved && (p.productStory || p.originStory));

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Product Experience" }]} />
      <h1 className="mb-2 text-2xl font-bold">Product Experience Manager</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        {pendingApproval.length} product{pendingApproval.length !== 1 ? "s" : ""} awaiting content approval.
      </p>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                <Link href={`/admin/products/experience/${p.id}`} className="text-xs font-semibold text-saveo-emerald-600 hover:underline">
                  Edit story, ingredients, nutrition &amp; badges →
                </Link>
                <p className="text-xs text-saveo-emerald-700/40">Internal — supplier not shown to customers</p>
              </div>
              <ExperienceControls
                productId={p.id}
                experienceType={p.experienceType}
                experienceApproved={p.experienceApproved}
                discoveryScore={p.discoveryScore}
              />
            </div>
            {p.productStory && <p className="text-xs text-saveo-emerald-700/60">📖 {p.productStory}</p>}
            {p.originStory && <p className="mt-1 text-xs text-saveo-emerald-700/60">🌍 {p.originStory}</p>}
          </div>
        ))}
        {products.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No products with experience content yet.
          </div>
        )}
      </div>
    </div>
  );
}
