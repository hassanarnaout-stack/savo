"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Ban, RotateCcw } from "lucide-react";

export function SupplierReviewActions({
  supplierId,
  status,
  verificationStatus,
}: {
  supplierId: string;
  status: string;
  verificationStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Supplier ${action.toLowerCase()}d`);
      router.refresh();
    } catch {
      toast.error("Could not update supplier status");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "SUSPENDED" ? (
        <button onClick={() => act("REACTIVATE")} disabled={!!loading} className="btn-primary !py-2 text-sm">
          <RotateCcw className="h-4 w-4" /> Reactivate
        </button>
      ) : (
        <>
          {verificationStatus !== "VERIFIED" || status !== "ACTIVE" ? (
            <button onClick={() => act("APPROVE")} disabled={!!loading} className="btn-primary !py-2 text-sm">
              <Check className="h-4 w-4" /> Approve
            </button>
          ) : null}
          {status !== "REJECTED" && (
            <button
              onClick={() => act("REJECT")}
              disabled={!!loading}
              className="btn-outline !py-2 text-sm !border-red-300 !text-red-600 hover:!border-red-500"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          )}
          {status === "ACTIVE" && (
            <button
              onClick={() => act("SUSPEND")}
              disabled={!!loading}
              className="btn-outline !py-2 text-sm !border-orange-300 !text-orange-600 hover:!border-orange-500"
            >
              <Ban className="h-4 w-4" /> Suspend
            </button>
          )}
        </>
      )}
    </div>
  );
}
