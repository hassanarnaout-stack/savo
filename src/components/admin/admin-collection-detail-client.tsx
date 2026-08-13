"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface CollectionProduct {
  productId: string;
  product: { name: string; images: { url: string }[] };
}

export function AdminCollectionDetailClient({ collectionId, collectionName, initialProducts }: { collectionId: string; collectionName: string; initialProducts: CollectionProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [productIdToAdd, setProductIdToAdd] = useState("");
  const [saving, setSaving] = useState(false);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productIdToAdd.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productIdToAdd.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product added");
      setProductIdToAdd("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message ?? "Could not add product");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(productId: string) {
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((p) => p.productId !== productId));
      toast.success("Product removed");
    } catch {
      toast.error("Could not remove product");
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">{collectionName}</h1>

      <form onSubmit={addProduct} className="mb-6 card flex gap-2 p-4">
        <input
          value={productIdToAdd}
          onChange={(e) => setProductIdToAdd(e.target.value)}
          placeholder="Product ID (copy from /admin/products)"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.productId} className="flex items-center justify-between rounded-xl2 border border-black/5 bg-white p-3">
            <div className="flex items-center gap-3">
              {p.product.images[0]?.url && <img src={p.product.images[0].url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
              <p className="text-sm font-semibold">{p.product.name}</p>
            </div>
            <button onClick={() => removeProduct(p.productId)} aria-label="Remove"><Trash2 className="h-4 w-4 text-red-500" /></button>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No products yet — add one above.</p>}
      </div>
    </div>
  );
}
