import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/category-manager";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-2 text-2xl font-bold">Categories</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Categories are fully dynamic — add new ones any time (e.g. Home, Cleaning, Kitchen, Fashion)
        without any code changes.
      </p>
      <CategoryManager
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          isFeatured: c.isFeatured,
          isActive: c.isActive,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
