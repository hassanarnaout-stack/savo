import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CreateBrandControl } from "@/components/admin/create-brand-control";
import { BrandBackfillControl } from "@/components/admin/brand-backfill-control";

export default async function AdminCatalogBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog Brands</h1>
          <p className="text-sm text-saveo-muted">Merchandising/catalog entities for products — completely separate from Brand Accounts (paid marketing partners).</p>
        </div>
        <CreateBrandControl />
      </div>

      <BrandBackfillControl />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-saveo-muted">
            <th className="py-2 pr-2">Logo</th>
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2">Products</th>
            <th className="py-2 pr-2">Active</th>
            <th className="py-2 pr-2">Featured</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="py-2 pr-2">{b.logoUrl ? <img src={b.logoUrl} alt="" className="h-8 w-8 rounded object-contain" /> : <span className="flex h-8 w-8 items-center justify-center rounded bg-saveo-emerald-100 text-xs font-bold">{b.name[0]}</span>}</td>
              <td className="py-2 pr-2"><Link href={`/admin/catalog-brands/${b.id}`} className="font-semibold text-saveo-emerald-700">{b.name}</Link></td>
              <td className="py-2 pr-2">{b._count.products}</td>
              <td className="py-2 pr-2">{b.isActive ? "Yes" : "No"}</td>
              <td className="py-2 pr-2">{b.isFeatured ? "Yes" : "No"}</td>
            </tr>
          ))}
          {brands.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-saveo-muted">No catalog brands yet — use Backfill above to create them from existing products, or add one manually.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
