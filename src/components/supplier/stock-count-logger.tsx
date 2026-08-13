"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function StockCountLogger({ products }: { products: { id: string; name: string; stockQty: number }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [physicalQuantity, setPhysicalQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = products.find((p) => p.id === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || physicalQuantity === "") return toast.error("Select a product and enter the counted quantity");
    setSaving(true);
    try {
      const res = await fetch("/api/supplier/inventory/stock-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, physicalQuantity: parseInt(physicalQuantity, 10), method: "MANUAL" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stock count recorded — system quantity adjusted if it differed");
      setPhysicalQuantity("");
      router.refresh();
    } catch {
      toast.error("Could not record stock count");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Stock Count</h2>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
        <option value="">Select product...</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name} (system: {p.stockQty})</option>
        ))}
      </select>
      {selected && <p className="text-xs text-saveo-emerald-700/50">System currently shows {selected.stockQty} units.</p>}
      <input type="number" min="0" value={physicalQuantity} onChange={(e) => setPhysicalQuantity(e.target.value)} placeholder="Physically counted quantity" className="input text-sm" />
      <button type="submit" disabled={saving} className="btn-primary text-sm">Record Count</button>
    </form>
  );
}
