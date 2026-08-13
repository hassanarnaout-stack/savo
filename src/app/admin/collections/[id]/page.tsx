import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminCollectionDetailClient } from "@/components/admin/admin-collection-detail-client";

export default async function AdminCollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: { product: { select: { name: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });
  if (!collection) notFound();

  return <AdminCollectionDetailClient collectionId={collection.id} collectionName={collection.name} initialProducts={collection.products} />;
}
