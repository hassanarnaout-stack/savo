"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function InventoryAdjustmentLogger({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"RETURNED" | "DAMAGED" | "EXPIRED">("DAMAGED");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return toast.error("Select a product");
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return toast.error("Enter a valid quantity");

    setSaving(true);
    try {
      const res = await fetch(`/api/supplier/inventory/${productId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, quantity: qty, note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not record adjustment");
      }
      toast.success("Adjustment recorded");
      setQuantity("1");
      setNote("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not record adjustment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Log Return / Damage / Expiry</h2>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
        <option value="">Select product...</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="input text-sm">
          <option value="DAMAGED">Damaged</option>
          <option value="EXPIRED">Expired</option>
          <option value="RETURNED">Returned (back to sellable stock)</option>
        </select>
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input text-sm" placeholder="Quantity" />
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="input text-sm" />
      <button type="submit" disabled={saving} className="btn-primary text-sm">Record Adjustment</button>
    </form>
  );
}
