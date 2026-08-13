import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Layers } from "lucide-react";

export default async function CollectionsPage() {
  const locale = await getLocale();
  const collections = await prisma.collection.findMany({
    where: { isActive: true, products: { some: {} } },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-center text-3xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "📦 التجميعات المنتقاة" : "📦 Curated Collections"}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => {
          const name = locale === "ar" && c.nameAr ? c.nameAr : c.name;
          const description = locale === "ar" && c.descriptionAr ? c.descriptionAr : c.description;
          return (
            <Link key={c.id} href={`/collections/${c.slug}`} className="card-float shadow-luxury overflow-hidden rounded-xl2 bg-white">
              <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-saveo-emerald-800 to-saveo-emerald-600">
                {c.coverImageUrl ? (
                  <img src={c.coverImageUrl} alt={name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Layers className="h-10 w-10 text-white/60" />
                )}
              </div>
              <div className="p-4">
                <p className="font-bold text-saveo-emerald-700">{name}</p>
                {description && <p className="mt-1 line-clamp-2 text-xs text-saveo-emerald-700/50">{description}</p>}
                <p className="mt-2 text-xs font-semibold text-saveo-gold-600">{c._count.products} {locale === "ar" ? "منتج" : "products"}</p>
              </div>
            </Link>
          );
        })}
        {collections.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-saveo-emerald-700/40">
            {locale === "ar" ? "صفر تجميعات متاحة حالياً." : "No collections available yet."}
          </p>
        )}
      </div>
    </div>
  );
}
