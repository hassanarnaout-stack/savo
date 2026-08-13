import { prisma } from "@/lib/prisma";
import { AdTemplateBuilderForm } from "@/components/admin/ad-template-builder-form";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdTemplatesPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true, name: true, saveoPrice: true, discountPct: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Marketing Studio", href: "/admin/marketing/studio" }, { label: "Ad Templates" }]} />
      <h1 className="mb-6 text-2xl font-bold">Ad Template Builder</h1>
      <AdTemplateBuilderForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          imageUrl: p.images[0]?.url ?? null,
          saveoPrice: Number(p.saveoPrice),
          discountPct: p.discountPct,
        }))}
      />
    </div>
  );
}
