import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CatalogBrandForm } from "@/components/admin/catalog-brand-form";

export default async function EditCatalogBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Edit Brand</h1>
      <CatalogBrandForm brand={brand} />
    </div>
  );
}
