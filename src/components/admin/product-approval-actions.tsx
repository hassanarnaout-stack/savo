"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export function ProductApprovalActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "APPROVE" | "REJECT") {
    let rejectionReason: string | undefined;
    if (action === "REJECT") {
      const reason = prompt("Reason for rejection (shown to the supplier):");
      if (reason === null) return; // cancelled
      rejectionReason = reason || undefined;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "APPROVE" ? "Product approved" : "Product rejected");
      router.refresh();
    } catch {
      toast.error("Could not update product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button onClick={() => act("APPROVE")} disabled={loading} className="btn-primary !py-2 text-sm">
        <Check className="h-4 w-4" /> Approve
      </button>
      <button
        onClick={() => act("REJECT")}
        disabled={loading}
        className="btn-outline !py-2 text-sm !border-red-300 !text-red-600 hover:!border-red-500"
      >
        <X className="h-4 w-4" /> Reject
      </button>
    </div>
  );
}
