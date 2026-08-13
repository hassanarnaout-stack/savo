"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ApprovePriceButton({ productId, suggestedPrice }: { productId: string; suggestedPrice: number }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [approved, setApproved] = useState(false);

  async function approve() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pricing/${productId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPrice: suggestedPrice }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Price updated to ${suggestedPrice.toFixed(3)} KD`);
      setApproved(true);
      router.refresh();
    } catch {
      toast.error("Could not update price");
    } finally {
      setSaving(false);
    }
  }

  if (approved) return <span className="text-xs font-semibold text-saveo-emerald-600">✓ Approved</span>;

  return (
    <button onClick={approve} disabled={saving} className="btn-primary !py-1.5 text-xs">
      Approve {suggestedPrice.toFixed(3)} KD
    </button>
  );
}
