"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ModerateReviewButtons({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function act(status: "APPROVED" | "REJECTED") {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === "APPROVED" ? "Review approved" : "Review rejected");
      router.refresh();
    } catch {
      toast.error("Could not update review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-1.5">
      <button onClick={() => act("APPROVED")} disabled={saving} className="btn-primary !py-1.5 text-xs">Approve</button>
      <button onClick={() => act("REJECTED")} disabled={saving} className="text-xs font-semibold text-red-600">Reject</button>
    </div>
  );
}
