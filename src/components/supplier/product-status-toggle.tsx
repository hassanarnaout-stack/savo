"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STYLES: Record<string, string> = {
  ACTIVE: "bg-saveo-emerald-100 text-saveo-emerald-800",
  DRAFT: "bg-black/5 text-saveo-emerald-700/60",
  OUT_OF_STOCK: "bg-orange-100 text-orange-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

export function ProductStatusToggle({ productId, status }: { productId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (status === "OUT_OF_STOCK" || status === "ARCHIVED") return; // system/managed states, not manually toggleable here
    setLoading(true);
    try {
      const res = await fetch(`/api/supplier/products/${productId}/toggle`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update product status");
    } finally {
      setLoading(false);
    }
  }

  const clickable = status === "ACTIVE" || status === "DRAFT";

  return (
    <button
      onClick={toggle}
      disabled={loading || !clickable}
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STYLES[status] ?? "bg-black/5"} ${
        clickable ? "hover:opacity-80" : "cursor-default"
      }`}
      title={clickable ? "Click to toggle Active/Draft" : undefined}
    >
      {status}
    </button>
  );
}
