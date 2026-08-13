"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CampaignRewardEditor } from "@/components/admin/campaign-reward-editor";

const EDITABLE_TYPES = ["TREASURE_CHEST", "MYSTERY_SAFE", "GOLDEN_TICKET", "TREASURE_MAP", "LIMITED_TIME_HUNT", "SURPRISE_ENVELOPE", "COLLECT_UNLOCK", "PICK_THREE", "HIDDEN_CASHBACK"];

export function CollapsibleRewardEditor({ campaignId, type, config }: { campaignId: string; type: string; config: any }) {
  const [open, setOpen] = useState(false);
  if (!EDITABLE_TYPES.includes(type)) return null;

  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-semibold text-saveo-emerald-600">
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Edit Rewards & Odds
      </button>
      {open && (
        <div className="mt-3">
          <CampaignRewardEditor campaignId={campaignId} type={type} config={config} />
        </div>
      )}
    </div>
  );
}
