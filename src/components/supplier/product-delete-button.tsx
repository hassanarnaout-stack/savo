"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ProductDeleteButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove "${productName}" from your catalog?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/supplier/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(data.hardDeleted ? "Product deleted" : "Product archived (it has order history)");
      router.refresh();
    } catch {
      toast.error("Could not delete product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-saveo-emerald-700/40 hover:text-red-500"
      aria-label="Delete product"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
