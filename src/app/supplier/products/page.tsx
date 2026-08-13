import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { getAvailableStock } from "@/lib/inventory";
import { Plus, Search } from "lucide-react";
import { ProductStatusToggle } from "@/components/supplier/product-status-toggle";
import { ProductDeleteButton } from "@/components/supplier/product-delete-button";
import { SortableHeader } from "@/components/admin/sortable-header";
import { parseSortParams } from "@/lib/sort-params";

const PAGE_SIZE = 20;
const SORTABLE_FIELDS = ["name", "stockQty", "saveoPrice", "orderCount", "createdAt"];

interface Props {
  searchParams: Promise<{ q?: string; category?: string; page?: string; sort?: string; dir?: string }>;
}

export default async function SupplierProductsPage({ searchParams }: Props) {
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

  const { q, category, page, sort, dir } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const { field: sortField, dir: sortDir } = parseSortParams({ sort, dir }, SORTABLE_FIELDS, "createdAt", "desc");

  // SECURITY: supplierId is always the signed-in supplier's own id — never
  // taken from the client. This `where` clause is the single boundary that
  // guarantees a supplier only ever sees/manages their own catalog.
  const where = {
    supplierId: supplier.id,
    status: { not: "ARCHIVED" as const },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { barcode: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { internalCode: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category ? { categoryId: category } : {}),
  };

  const [products, totalCount, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        stockQty: true,
        reservedStock: true,
        lowStockAlert: true,
        saveoPrice: true,
        originalPrice: true,
        discountPct: true,
        barcode: true,
        approvalStatus: true,
        rejectionReason: true,
        orderCount: true,
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-saveo-emerald-700">Products</h1>
          <p className="text-sm text-saveo-emerald-700/50">{totalCount} products in your catalog</p>
        </div>
        <Link href="/supplier/products/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      {/* Search + category filter */}
      <form className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saveo-emerald-700/40" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search your products or scan a barcode..."
            className="w-full rounded-full border border-black/10 py-2 ps-9 pe-4 text-sm"
          />
        </div>
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-full border border-black/10 px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-outline !py-2 text-sm">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="px-4 py-3"><SortableHeader field="name" label="Product" /></th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3"><SortableHeader field="saveoPrice" label="Price" /></th>
              <th className="px-4 py-3"><SortableHeader field="stockQty" label="Stock" /></th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="flex items-center gap-3 px-4 py-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/5">
                    {p.images[0] && <Image src={p.images[0].url} alt={p.name} fill className="object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                    {p.barcode && <p className="font-mono text-[10px] text-saveo-emerald-700/40">{p.barcode}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">{p.category.name}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{formatKWD(Number(p.saveoPrice))}</span>
                  {p.discountPct > 0 && (
                    <span className="ms-1 text-xs text-saveo-emerald-600">-{p.discountPct}%</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={getAvailableStock(p.stockQty, p.reservedStock) <= p.lowStockAlert ? "font-bold text-red-600" : ""}>
                    {getAvailableStock(p.stockQty, p.reservedStock)}
                    {p.reservedStock > 0 && <span className="ms-1 text-xs font-normal text-saveo-emerald-700/40">({p.reservedStock} held)</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ProductStatusToggle productId={p.id} status={p.status} />
                  {p.approvalStatus !== "APPROVED" && (
                    <div className="mt-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.approvalStatus === "PENDING_REVIEW"
                            ? "bg-amber-100 text-amber-700"
                            : p.approvalStatus === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-black/5 text-saveo-emerald-700/50"
                        }`}
                        title={p.rejectionReason ?? undefined}
                      >
                        {p.approvalStatus === "PENDING_REVIEW" ? "Pending Admin Review" : p.approvalStatus}
                      </span>
                      {p.approvalStatus === "REJECTED" && p.rejectionReason && (
                        <p className="mt-0.5 max-w-[160px] text-[10px] text-red-600">{p.rejectionReason}</p>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/supplier/products/${p.id}/edit`} className="text-xs font-semibold text-saveo-emerald-600">
                      Edit
                    </Link>
                    <ProductDeleteButton productId={p.id} productName={p.name} />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-saveo-emerald-700/40">
                  {q || category ? "No products match your filters." : "You haven't added any products yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/supplier/products?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(category ? { category } : {}),
                page: String(p),
              })}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                p === currentPage ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
