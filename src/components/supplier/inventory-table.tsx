"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

interface Row {
  id: string;
  name: string;
  image: string | null;
  stockQty: number;
  reservedStock: number;
  lowStockAlert: number;
  available: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

const STATUS_STYLES: Record<string, string> = {
  IN_STOCK: "bg-saveo-emerald-100 text-saveo-emerald-800",
  LOW_STOCK: "bg-amber-100 text-amber-700",
  OUT_OF_STOCK: "bg-red-100 text-red-700",
};

export function InventoryTable({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [rowResults, setRowResults] = useState<Record<string, "success" | "error">>({});
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<keyof Row | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // 3-state cycle per column: asc -> desc -> unsorted, matching the same
  // pattern as SortableHeader used everywhere else in the app.
  function handleSort(field: keyof Row) {
    if (sortField !== field) {
      setSortField(field);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortField(null);
    }
  }

  const displayRows = useMemo(() => {
    if (!sortField) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortField, sortDir]);

  function SortIcon({ field }: { field: keyof Row }) {
    if (sortField !== field) return <span className="ms-1 text-black/20">↕</span>;
    return <span className="ms-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const dirtyIds = useMemo(() => Object.keys(edits), [edits]);

  function editQty(id: string, value: string) {
    const n = parseInt(value, 10);
    setRowResults((r) => ({ ...r, [id]: undefined as any }));
    if (isNaN(n) || n < 0) {
      setEdits((e) => {
        const next = { ...e };
        delete next[id];
        return next;
      });
      return;
    }
    setEdits((e) => ({ ...e, [id]: n }));
  }

  async function saveAll() {
    if (dirtyIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/supplier/inventory/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: dirtyIds.map((id) => ({ productId: id, newQuantity: edits[id] })),
        }),
      });
      if (!res.ok) throw new Error();
      const data: { results: { productId: string; success: boolean }[]; successCount: number; failCount: number } =
        await res.json();

      const resultMap: Record<string, "success" | "error"> = {};
      for (const r of data.results) resultMap[r.productId] = r.success ? "success" : "error";
      setRowResults(resultMap);

      // Reflect successful changes locally, recomputing available/status
      setRows((prev) =>
        prev.map((row) => {
          if (resultMap[row.id] !== "success") return row;
          const newStock = edits[row.id];
          const available = Math.max(0, newStock - row.reservedStock);
          const stockStatus =
            available <= 0 ? "OUT_OF_STOCK" : available <= row.lowStockAlert ? "LOW_STOCK" : "IN_STOCK";
          return { ...row, stockQty: newStock, available, stockStatus };
        })
      );

      if (data.failCount === 0) {
        toast.success(`Updated ${data.successCount} product${data.successCount !== 1 ? "s" : ""}`);
        setEdits({});
      } else {
        toast.error(`${data.successCount} updated, ${data.failCount} failed — see highlighted rows`);
      }
    } catch {
      toast.error("Could not save inventory changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {dirtyIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl2 bg-saveo-gold-50 px-4 py-3 text-sm">
          <span className="font-semibold text-saveo-emerald-700">
            {dirtyIds.length} unsaved change{dirtyIds.length !== 1 ? "s" : ""}
          </span>
          <button onClick={saveAll} disabled={saving} className="btn-primary !py-1.5 text-xs">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="cursor-pointer select-none px-4 py-3" onClick={() => handleSort("name")}>Product<SortIcon field="name" /></th>
              <th className="cursor-pointer select-none px-4 py-3" onClick={() => handleSort("stockQty")}>Current Stock<SortIcon field="stockQty" /></th>
              <th className="cursor-pointer select-none px-4 py-3" onClick={() => handleSort("reservedStock")}>Reserved<SortIcon field="reservedStock" /></th>
              <th className="cursor-pointer select-none px-4 py-3" onClick={() => handleSort("available")}>Available<SortIcon field="available" /></th>
              <th className="cursor-pointer select-none px-4 py-3" onClick={() => handleSort("stockStatus")}>Status<SortIcon field="stockStatus" /></th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const edited = edits[row.id];
              const result = rowResults[row.id];
              return (
                <tr
                  key={row.id}
                  className={`border-b border-black/5 last:border-0 ${
                    result === "error" ? "bg-red-50" : result === "success" ? "bg-saveo-emerald-50/50" : ""
                  }`}
                >
                  <td className="flex items-center gap-3 px-4 py-3">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-black/5">
                      {row.image && <Image src={row.image} alt={row.name} fill className="object-cover" />}
                    </div>
                    <span className="line-clamp-1 font-medium">{row.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      defaultValue={row.stockQty}
                      onChange={(e) => editQty(row.id, e.target.value)}
                      className="w-20 rounded-lg border border-black/10 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-saveo-emerald-700/60">{row.reservedStock}</td>
                  <td className="px-4 py-3 font-semibold">
                    {edited !== undefined ? Math.max(0, edited - row.reservedStock) : row.available}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[row.stockStatus]}`}>
                      {row.stockStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link href={`/supplier/inventory/${row.id}/history`} className="text-xs font-semibold text-saveo-emerald-600">
                      History
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-saveo-emerald-700/40">
                  No products to manage yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
