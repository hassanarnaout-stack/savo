import { prisma } from "@/lib/prisma";
import { ProductImportWizard } from "@/components/admin/product-import-wizard";

export default async function AdminProductImportPage() {
  const suppliers = await prisma.supplier.findMany({ where: { status: "ACTIVE" }, orderBy: { companyName: "asc" }, select: { id: true, companyName: true } });

  return (
    <div className="p-6 sm:p-8">
      <ProductImportWizard apiBase="/api/admin/products" suppliers={suppliers} />
    </div>
  );
}
