"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteCampaignButton({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not delete campaign");
        setConfirming(false);
        return;
      }
      toast.success("Campaign deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete campaign");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-saveo-emerald-700/60">Delete "{campaignName}"?</span>
        <button onClick={handleDelete} disabled={deleting} className="font-bold text-red-600">
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-saveo-emerald-700/40">Cancel</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} aria-label="Delete campaign" className="text-saveo-emerald-700/30 hover:text-red-500">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
