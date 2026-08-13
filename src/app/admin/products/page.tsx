import { prisma } from "@/lib/prisma";
import { formatKWD, isLowStock } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import { parseSortParams } from "@/lib/sort-params";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { ProductBulkTable } from "@/components/admin/product-bulk-table";

interface Props {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    dir?: string;
    category?: string;
    supplier?: string;
    stockStatus?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
  }>;
}

const SORTABLE_FIELDS = ["name", "stockQty", "saveoPrice", "orderCount", "createdAt"];
const PAGE_SIZES = [10, 25, 50, 100];

export default async function AdminProductsPage({ searchParams }: Props) {
  const { q, sort, dir, category, supplier, stockStatus, status, dateFrom, dateTo, page, pageSize } = await searchParams;
  const { field, dir: sortDir } = parseSortParams({ sort, dir }, SORTABLE_FIELDS, "createdAt", "desc");
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const size = PAGE_SIZES.includes(Number(pageSize)) ? Number(pageSize) : 25;

  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { verificationStatus: "VERIFIED" }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
  ]);

  const where: any = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { internalCode: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { categoryId: category } : {}),
    ...(supplier ? { supplierId: supplier } : {}),
    ...(status ? { status } : {}),
    ...(stockStatus === "OUT_OF_STOCK" ? { stockQty: 0 } : {}),
    ...(stockStatus === "IN_STOCK" ? { stockQty: { gt: 0 } } : {}),
    ...(dateFrom || dateTo
      ? { createdAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } }
      : {}),
  };

  // Low Stock can't be expressed as a Prisma where-clause (relative to
  // each product's own lowStockAlert), so when it's active we can't
  // paginate at the DB level — fetch a bounded batch and filter/paginate
  // in memory instead.
  const isLowStockFilter = stockStatus === "LOW_STOCK";

  const totalCount = isLowStockFilter
    ? undefined
    : await prisma.product.count({ where });

  const skip: number = isLowStockFilter ? 0 : (currentPage - 1) * size;
  const take: number = isLowStockFilter ? 1000 : size;

  let products = await prisma.product.findMany({
    where,
    orderBy: { [field]: sortDir },
    include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    skip,
    take,
  });

  if (isLowStockFilter) {
    products = products.filter((p) => p.stockQty > 0 && p.stockQty <= p.lowStockAlert);
  }

  const effectiveTotal = totalCount ?? products.length;
  const pagedProducts = isLowStockFilter ? products.slice((currentPage - 1) * size, currentPage * size) : products;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / size));

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Products" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products or scan a barcode..."
          className="w-full max-w-sm rounded-full border border-black/10 px-4 py-2 text-sm"
        />
        <select name="category" defaultValue={category ?? ""} className="input text-sm">
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="supplier" defaultValue={supplier ?? ""} className="input text-sm">
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.companyName}</option>
          ))}
        </select>
        <select name="stockStatus" defaultValue={stockStatus ?? ""} className="input text-sm">
          <option value="">All Stock</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="input text-sm">
          <option value="">Active/Inactive</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <input type="date" name="dateFrom" defaultValue={dateFrom} className="input text-sm" title="From" />
        <input type="date" name="dateTo" defaultValue={dateTo} className="input text-sm" title="To" />
        <button type="submit" className="btn-outline text-sm">Apply Filters</button>
        <a href="/admin/products" className="text-xs font-semibold text-saveo-emerald-700/50 hover:underline">Clear</a>
      </form>

      <ProductBulkTable
        products={pagedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          categoryName: p.category.name,
          saveoPrice: Number(p.saveoPrice),
          discountPct: p.discountPct,
          stockQty: p.stockQty,
          status: p.status,
          imageUrl: p.images[0]?.url ?? null,
          lowStock: isLowStock(p.stockQty, p.lowStockAlert),
        }))}
        categories={categories}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-saveo-emerald-700/50">Rows per page:</span>
          {PAGE_SIZES.map((s) => (
            <a
              key={s}
              href={`?${new URLSearchParams({ ...(q && { q }), pageSize: String(s) }).toString()}`}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${size === s ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/60"}`}
            >
              {s}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-saveo-emerald-700/50">
            Page {currentPage} of {totalPages} ({effectiveTotal} products)
          </span>
          {currentPage > 1 && (
            <a href={`?${new URLSearchParams({ pageSize: String(size), page: String(currentPage - 1) }).toString()}`} className="btn-outline !py-1.5 text-xs">Previous</a>
          )}
          {currentPage < totalPages && (
            <a href={`?${new URLSearchParams({ pageSize: String(size), page: String(currentPage + 1) }).toString()}`} className="btn-outline !py-1.5 text-xs">Next</a>
          )}
        </div>
      </div>
    </div>
  );
}
