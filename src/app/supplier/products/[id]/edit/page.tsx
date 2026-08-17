import { redirect, notFound } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SupplierProductForm } from "@/components/supplier/product-form";
import { ProductSpecificationControls } from "@/components/admin/product-specification-controls";
import { ProductMediaManager } from "@/components/admin/product-media-manager";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSupplierProductPage({ params }: Props) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/products");
      case "WRONG_ROLE":
        redirect("/");
      case "NO_SUPPLIER_PROFILE":
        redirect("/supplier/register");
      case "PENDING":
        redirect("/supplier/pending");
      case "REJECTED":
        redirect("/supplier/rejected");
      case "SUSPENDED":
        redirect("/supplier/suspended");
    }
  }
  const { supplier } = gate;

  const { id } = await params;

  const [product, categories, attributes, media] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { take: 1 } } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.productAttribute.findMany({ where: { productId: id } }),
    prisma.productMedia.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" } }),
  ]);

  // SECURITY: 404 (not 403) if the product doesn't exist OR belongs to a
  // different supplier — never reveal another supplier's product exists.
  if (!product || product.supplierId !== supplier.id) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-saveo-emerald-700">Edit Product</h1>
      <SupplierProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          nameAr: product.nameAr ?? "",
          description: product.description,
          descriptionAr: product.descriptionAr ?? "",
          categoryId: product.categoryId,
          type: product.type,
          originalPrice: product.originalPrice.toString(),
          saveoPrice: product.saveoPrice.toString(),
          stockQty: product.stockQty.toString(),
          lowStockAlert: product.lowStockAlert.toString(),
          dealEndsAt: product.dealEndsAt ? new Date(product.dealEndsAt).toISOString().slice(0, 16) : "",
          expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : "",
          imageUrl: product.images[0]?.url ?? "",
          mysteryBoxReveal: product.mysteryBoxReveal ?? "",
          barcode: product.barcode ?? "",
          internalCode: product.internalCode ?? "",
          purchaseCost: product.purchaseCost?.toString() ?? "",
          productStory: product.productStory ?? "",
          originStory: product.originStory ?? "",
        }}
      />
      <ProductMediaManager productId={product.id} apiBase="/api/supplier/products" initialMedia={media} />
      <ProductSpecificationControls productId={product.id} apiBase="/api/supplier/products" initialAttributes={attributes} />
    </div>
  );
}
