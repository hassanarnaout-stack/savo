import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableStock, getStockStatus } from "@/lib/inventory";
import { InventoryTable } from "@/components/supplier/inventory-table";
import { InventoryAdjustmentLogger } from "@/components/supplier/inventory-adjustment-logger";
import { StockCountLogger } from "@/components/supplier/stock-count-logger";
import { AlertTriangle, PackageX } from "lucide-react";

interface Props {
  searchParams: Promise<{ filter?: string }>;
}

export default async function SupplierInventoryPage({ searchParams }: Props) {
  const { filter } = await searchParams;
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/inventory");
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

  const products = await prisma.product.findMany({
    where: { supplierId: supplier.id, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      stockQty: true,
      reservedStock: true,
      lowStockAlert: true,
      status: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images[0]?.url ?? null,
    stockQty: p.stockQty,
    reservedStock: p.reservedStock,
    lowStockAlert: p.lowStockAlert,
    available: getAvailableStock(p.stockQty, p.reservedStock),
    stockStatus: getStockStatus(p.stockQty, p.reservedStock, p.lowStockAlert),
  }));

  const lowStockCount = rows.filter((r) => r.stockStatus === "LOW_STOCK").length;
  const outOfStockCount = rows.filter((r) => r.stockStatus === "OUT_OF_STOCK").length;

  const filteredRows =
    filter === "LOW_STOCK" ? rows.filter((r) => r.stockStatus === "LOW_STOCK") :
    filter === "OUT_OF_STOCK" ? rows.filter((r) => r.stockStatus === "OUT_OF_STOCK") :
    rows;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-saveo-emerald-700">Inventory</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Manage stock levels across your catalog. Every change is logged.
      </p>

      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl2 border border-red-200 bg-red-50 p-4">
              <PackageX className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-bold text-red-700">{outOfStockCount} product{outOfStockCount !== 1 ? "s" : ""} out of stock</p>
                <p className="text-xs text-red-600/70">Customers can't buy these until restocked</p>
              </div>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl2 border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div>
                <p className="font-bold text-amber-700">{lowStockCount} product{lowStockCount !== 1 ? "s" : ""} running low</p>
                <p className="text-xs text-amber-600/70">Below your low-stock threshold</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <a href="/supplier/inventory" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${!filter ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
          All ({rows.length})
        </a>
        <a href="/supplier/inventory?filter=LOW_STOCK" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${filter === "LOW_STOCK" ? "bg-amber-500 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
          Low Stock ({lowStockCount})
        </a>
        <a href="/supplier/inventory?filter=OUT_OF_STOCK" className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${filter === "OUT_OF_STOCK" ? "bg-red-600 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
          Out of Stock ({outOfStockCount})
        </a>
      </div>

      <InventoryTable initialRows={filteredRows} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InventoryAdjustmentLogger products={rows.map((r) => ({ id: r.id, name: r.name }))} />
        <StockCountLogger products={rows.map((r) => ({ id: r.id, name: r.name, stockQty: r.stockQty }))} />
      </div>
    </div>
  );
}
