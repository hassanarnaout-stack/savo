"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Attribute {
  id: string;
  key: string;
  keyAr: string | null;
  value: string;
  valueAr: string | null;
}

/** Reused by both the admin and supplier product edit pages —
 * `apiBase` is the only thing that differs (`/api/admin/products/{id}`
 * vs `/api/supplier/products/{id}`), so ownership/authorization is
 * always enforced server-side by whichever route actually receives
 * the request, never assumed client-side. */
export function ProductSpecificationControls({ productId, apiBase, initialAttributes }: { productId: string; apiBase: string; initialAttributes: Attribute[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState({ key: "", keyAr: "", value: "", valueAr: "" });

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    if (!newRow.key.trim() || !newRow.value.trim()) return toast.error("English label and value are required");
    setSaving("new");
    try {
      const res = await fetch(`${apiBase}/${productId}/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not add specification");
      toast.success("Specification added");
      setNewRow({ key: "", keyAr: "", value: "", valueAr: "" });
      setShowAdd(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not add specification");
    } finally {
      setSaving(null);
    }
  }

  async function removeRow(attr: Attribute) {
    if (!confirm(`Remove "${attr.key}"?`)) return;
    setSaving(attr.id);
    try {
      const res = await fetch(`${apiBase}/${productId}/attributes/${attr.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed");
      router.refresh();
    } catch {
      toast.error("Could not remove specification");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-8 border-t pt-6">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-saveo-muted">Product Specifications</h2>
      <p className="mb-4 text-xs text-saveo-muted">Shown to customers in the Product Details table on the product page. English label/value are required; Arabic is optional (falls back to English when missing).</p>

      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-saveo-muted">
            <th className="py-2 pr-2">Label (EN)</th>
            <th className="py-2 pr-2">Label (AR)</th>
            <th className="py-2 pr-2">Value (EN)</th>
            <th className="py-2 pr-2">Value (AR)</th>
            <th className="py-2 pr-2" />
          </tr>
        </thead>
        <tbody>
          {initialAttributes.map((attr) => (
            <tr key={attr.id} className="border-b">
              <td className="py-2 pr-2">{attr.key}</td>
              <td className="py-2 pr-2" dir="rtl">{attr.keyAr ?? "—"}</td>
              <td className="py-2 pr-2">{attr.value}</td>
              <td className="py-2 pr-2" dir="rtl">{attr.valueAr ?? "—"}</td>
              <td className="py-2 pr-2">
                <button onClick={() => removeRow(attr)} disabled={saving === attr.id} className="text-xs text-red-600">Remove</button>
              </td>
            </tr>
          ))}
          {initialAttributes.length === 0 && (
            <tr><td colSpan={5} className="py-4 text-center text-saveo-muted">No specifications yet — the Product Details table won't show on the product page unless a description exists.</td></tr>
          )}
        </tbody>
      </table>

      {showAdd ? (
        <form onSubmit={addRow} className="grid max-w-lg grid-cols-2 gap-3 rounded border p-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Label (English)</label>
            <input value={newRow.key} onChange={(e) => setNewRow({ ...newRow, key: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" placeholder="e.g. Volume" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Label (Arabic)</label>
            <input value={newRow.keyAr} onChange={(e) => setNewRow({ ...newRow, keyAr: e.target.value })} dir="rtl" className="w-full rounded border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Value (English)</label>
            <input value={newRow.value} onChange={(e) => setNewRow({ ...newRow, value: e.target.value })} className="w-full rounded border px-2 py-1.5 text-sm" placeholder="e.g. 100ml" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Value (Arabic)</label>
            <input value={newRow.valueAr} onChange={(e) => setNewRow({ ...newRow, valueAr: e.target.value })} dir="rtl" className="w-full rounded border px-2 py-1.5 text-sm" />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" disabled={saving === "new"} className="rounded bg-saveo-emerald-700 px-4 py-1.5 text-sm text-white">Add specification</button>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded border px-4 py-1.5 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)} className="rounded bg-saveo-emerald-700 px-4 py-2 text-sm text-white">+ Add specification</button>
      )}
    </div>
  );
}
