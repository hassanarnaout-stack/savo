"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateReceiptForm({ suppliers, products }: { suppliers: { id: string; companyName: string }[]; products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: "", costPrice: "", batchNumber: "", expiryDate: "" }]);
  const [saving, setSaving] = useState(false);

  function updateItem(i: number, field: string, value: string) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) return toast.error("Select a supplier");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: items
            .filter((i) => i.productId && i.quantity && i.costPrice)
            .map((i) => ({
              productId: i.productId,
              quantity: parseInt(i.quantity, 10),
              costPrice: parseFloat(i.costPrice),
              batchNumber: i.batchNumber || undefined,
              expiryDate: i.expiryDate || undefined,
            })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Goods receipt created (PENDING)");
      setItems([{ productId: "", quantity: "", costPrice: "", batchNumber: "", expiryDate: "" }]);
      router.refresh();
    } catch {
      toast.error("Could not create receipt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Create Goods Receipt</h2>
      <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input text-sm">
        <option value="">Select supplier...</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>{s.companyName}</option>
        ))}
      </select>

      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 rounded-lg border border-black/5 p-2">
          <select value={item.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} className="input text-xs">
            <option value="">Product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} className="input text-xs" />
          <input type="number" step="0.001" placeholder="Cost/unit" value={item.costPrice} onChange={(e) => updateItem(i, "costPrice", e.target.value)} className="input text-xs" />
          <input placeholder="Batch #" value={item.batchNumber} onChange={(e) => updateItem(i, "batchNumber", e.target.value)} className="input text-xs" />
          <input type="date" value={item.expiryDate} onChange={(e) => updateItem(i, "expiryDate", e.target.value)} className="input text-xs" />
        </div>
      ))}

      <button type="button" onClick={() => setItems([...items, { productId: "", quantity: "", costPrice: "", batchNumber: "", expiryDate: "" }])} className="text-xs font-semibold text-saveo-emerald-600">
        + Add item
      </button>

      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Create Receipt</button>
    </form>
  );
}

export function ReceiptStatusControls({ receiptId, status }: { receiptId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function runAction(action: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/receipts/${receiptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update receipt");
      toast.success("Receipt updated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update receipt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold text-saveo-emerald-700/70">{status}</span>
      {status === "PENDING" && <button onClick={() => runAction("RECEIVE")} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">Mark Received</button>}
      {status === "RECEIVED" && <button onClick={() => runAction("VERIFY")} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">Verify (apply to inventory)</button>}
      {(status === "PENDING" || status === "RECEIVED") && <button onClick={() => runAction("CANCEL")} disabled={saving} className="text-xs font-semibold text-red-600">Cancel</button>}
    </div>
  );
}
