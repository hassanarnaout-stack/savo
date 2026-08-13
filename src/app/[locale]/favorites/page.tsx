import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProductGrid } from "@/components/product/product-grid";
import { serializeProducts } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/favorites");

  const [favorites, t] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
      orderBy: { createdAt: "desc" },
    }),
    getTranslations("nav"),
  ]);

  const products = favorites.map((f) => f.product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">{t("favorites")}</h1>
      <ProductGrid products={serializeProducts(products) as any} />
    </div>
  );
}
