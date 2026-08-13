"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SponsoredSlotApprovalButtons({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function act(action: "APPROVE" | "REJECT") {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sponsored-slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "APPROVE" ? "Slot approved" : "Slot rejected");
      router.refresh();
    } catch {
      toast.error("Could not update slot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-1.5">
      <button onClick={() => act("APPROVE")} disabled={saving} className="btn-primary !py-1.5 text-xs">
        Approve
      </button>
      <button onClick={() => act("REJECT")} disabled={saving} className="text-xs font-semibold text-red-600">
        Reject
      </button>
    </div>
  );
}
