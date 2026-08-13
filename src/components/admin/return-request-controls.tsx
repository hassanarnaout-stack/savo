"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ReturnRequestControls({ returnRequestId }: { returnRequestId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handle(action: "APPROVE" | "REJECT") {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/return-requests/${returnRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not process return");
      toast.success(action === "APPROVE" ? "Return approved — refund processed" : "Return rejected");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not process return");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => handle("APPROVE")} disabled={saving} className="btn-primary !py-1.5 text-xs">Approve &amp; Refund</button>
      <button onClick={() => handle("REJECT")} disabled={saving} className="text-xs font-semibold text-red-600">Reject</button>
    </div>
  );
}
