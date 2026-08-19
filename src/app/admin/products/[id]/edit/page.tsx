import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductSpecificationControls } from "@/components/admin/product-specification-controls";
import { ProductMediaManager } from "@/components/admin/product-media-manager";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, categories, suppliers, catalogBrands, attributes, media] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { take: 1 } } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { status: "ACTIVE" }, orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.productAttribute.findMany({ where: { productId: id } }),
    prisma.productMedia.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Edit Product</h1>
      <ProductForm
        categories={categories}
        suppliers={suppliers}
        catalogBrands={catalogBrands}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          brandName: product.brandName ?? "",
          brandId: product.brandId,
          isSubscribable: product.isSubscribable,
          description: product.description,
          categoryId: product.categoryId,
          supplierId: product.supplierId,
          type: product.type,
          originalPrice: product.originalPrice.toString(),
          saveoPrice: product.saveoPrice.toString(),
          stockQty: product.stockQty.toString(),
          lowStockAlert: product.lowStockAlert.toString(),
          dealEndsAt: product.dealEndsAt ? new Date(product.dealEndsAt).toISOString().slice(0, 16) : "",
          expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : "",
          imageUrl: product.images[0]?.url ?? "",
          mysteryBoxReveal: product.mysteryBoxReveal ?? "",
          mysteryBoxValueMin: product.mysteryBoxValueMin?.toString() ?? "",
          mysteryBoxValueMax: product.mysteryBoxValueMax?.toString() ?? "",
          mysteryBoxTier: product.mysteryBoxTier ?? undefined,
          mysteryBoxLockedCount: product.mysteryBoxLockedCount?.toString() ?? "1",
          mysteryBoxChooseCount: product.mysteryBoxChooseCount?.toString() ?? "0",
          isMembersOnly: product.isMembersOnly,
          plusPrice: product.plusPrice?.toString() ?? "",
          earlyAccessStartsAt: product.earlyAccessStartsAt ? new Date(product.earlyAccessStartsAt).toISOString().slice(0, 16) : "",
          publicAccessStartsAt: product.publicAccessStartsAt ? new Date(product.publicAccessStartsAt).toISOString().slice(0, 16) : "",
        }}
      />
      <ProductMediaManager productId={product.id} apiBase="/api/admin/products" initialMedia={media} />
      <ProductSpecificationControls productId={product.id} apiBase="/api/admin/products" initialAttributes={attributes} />
    </div>
  );
}
