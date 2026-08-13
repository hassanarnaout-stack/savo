"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function CampaignCustomerCopyEditor({ campaignId, initialEn, initialAr }: { campaignId: string; initialEn: string; initialAr: string }) {
  const [en, setEn] = useState(initialEn);
  const [ar, setAr] = useState(initialAr);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/customer-copy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerDescription: en, customerDescriptionAr: ar }),
      });
      if (!res.ok) throw new Error();
      toast.success("Customer-facing description saved");
    } catch {
      toast.error("Could not save description");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
      <p className="text-xs font-semibold text-saveo-emerald-700/70">What customers see explaining this game (shown on its entry screen)</p>
      <textarea value={en} onChange={(e) => setEn(e.target.value)} placeholder="English description" rows={4} className="input text-xs" />
      <textarea value={ar} onChange={(e) => setAr(e.target.value)} placeholder="الوصف بالعربي" dir="rtl" rows={4} className="input text-xs" />
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-xs">
        <Save className="h-3.5 w-3.5" /> Save Description
      </button>
    </div>
  );
}
