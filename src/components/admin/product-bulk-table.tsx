"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKWD } from "@/lib/utils";
import { SortableHeader } from "@/components/admin/sortable-header";

interface ProductRow {
  id: string;
  name: string;
  barcode: string | null;
  categoryName: string;
  saveoPrice: number;
  discountPct: number;
  stockQty: number;
  status: string;
  imageUrl: string | null;
  lowStock: boolean;
}

export function ProductBulkTable({ products, categories }: { products: ProductRow[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function runBulkAction(action: "ACTIVATE" | "DEACTIVATE" | "SET_CATEGORY") {
    if (selected.size === 0) return toast.error("Select at least one product");
    if (action === "SET_CATEGORY" && !bulkCategoryId) return toast.error("Select a category first");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected], action, categoryId: bulkCategoryId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not apply bulk action");
      toast.success(`Updated ${data.count} product${data.count !== 1 ? "s" : ""}`);
      setSelected(new Set());
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not apply bulk action");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const rows = products.filter((p) => selected.size === 0 || selected.has(p.id));
    const header = ["Name", "Barcode", "Category", "Price", "Discount%", "Stock", "Status"];
    const lines = rows.map((p) =>
      [p.name, p.barcode ?? "", p.categoryName, p.saveoPrice, p.discountPct, p.stockQty, p.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saveo-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl2 bg-saveo-emerald-700 px-4 py-2.5 text-sm text-white">
          <span className="font-semibold">{selected.size} selected</span>
          <button onClick={() => runBulkAction("ACTIVATE")} disabled={saving} className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">Activate</button>
          <button onClick={() => runBulkAction("DEACTIVATE")} disabled={saving} className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">Deactivate</button>
          <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)} className="rounded-full bg-white/15 px-2 py-1 text-white">
            <option value="" className="text-black">Set category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="text-black">{c.name}</option>
            ))}
          </select>
          <button onClick={() => runBulkAction("SET_CATEGORY")} disabled={saving} className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">Apply</button>
          <button onClick={exportCsv} className="ms-auto rounded-full bg-saveo-gold-400 px-3 py-1 font-semibold text-saveo-emerald-900">Export CSV</button>
        </div>
      )}
      {selected.size === 0 && (
        <div className="mb-3 flex justify-end">
          <button onClick={exportCsv} className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-saveo-emerald-700">Export All to CSV</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3"><SortableHeader field="name" label="Product" /></th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3"><SortableHeader field="saveoPrice" label="Price" /></th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3"><SortableHeader field="stockQty" label="Stock" /></th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                </td>
                <td className="flex items-center gap-3 px-4 py-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/5">
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                    {p.barcode && <p className="font-mono text-[10px] text-saveo-emerald-700/40">{p.barcode}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">{p.categoryName}</td>
                <td className="px-4 py-3 font-semibold">{formatKWD(p.saveoPrice)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-saveo-emerald-50 px-2 py-0.5 text-xs font-bold text-saveo-emerald-800">-{p.discountPct}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className={p.lowStock ? "font-bold text-red-600" : ""}>{p.stockQty}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium">{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <a href={`/admin/products/${p.id}/edit`} className="text-xs font-semibold text-saveo-emerald-600">Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
