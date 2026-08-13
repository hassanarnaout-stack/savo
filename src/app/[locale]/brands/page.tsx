import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { brandNameToSlug } from "@/lib/brand-slug";
import { Sparkles } from "lucide-react";

export default async function BrandsPage() {
  const locale = await getLocale();

  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", brandName: { not: null } },
    select: { brandName: true },
    distinct: ["brandName"],
    orderBy: { brandName: "asc" },
  });

  const brands = rows.map((r) => r.brandName!).filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-center text-3xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🏷️ الماركات" : "🏷️ Brands"}
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {brands.map((brandName) => (
          <Link
            key={brandName}
            href={`/brands/${brandNameToSlug(brandName)}`}
            className="card-float shadow-luxury flex flex-col items-center gap-2 rounded-xl2 bg-white p-5 text-center"
          >
            <Sparkles className="h-6 w-6 text-saveo-gold-500" />
            <p className="text-sm font-bold text-saveo-emerald-700">{brandName}</p>
          </Link>
        ))}
        {brands.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-saveo-emerald-700/40">
            {locale === "ar" ? "صفر ماركات متاحة حالياً." : "No brands available yet."}
          </p>
        )}
      </div>
    </div>
  );
}
