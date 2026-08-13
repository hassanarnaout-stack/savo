"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface ChecklistData {
  companyInfoVerified: boolean;
  contactVerified: boolean;
  productQualityChecked: boolean;
  barcodeChecked: boolean;
  imagesChecked: boolean;
  pricingReviewed: boolean;
  commissionAgreed: boolean;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}

const ITEMS: { key: keyof Omit<ChecklistData, "status">; label: string }[] = [
  { key: "companyInfoVerified", label: "Company Information" },
  { key: "contactVerified", label: "Contact Verification" },
  { key: "productQualityChecked", label: "Product Quality Check" },
  { key: "barcodeChecked", label: "Barcode Check" },
  { key: "imagesChecked", label: "Images Check" },
  { key: "pricingReviewed", label: "Pricing Review" },
  { key: "commissionAgreed", label: "Commission Agreement" },
];

export function OnboardingChecklist({ supplierId, initial }: { supplierId: string; initial: ChecklistData }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);

  const completedCount = ITEMS.filter((i) => data[i.key]).length;

  async function toggle(key: keyof Omit<ChecklistData, "status">) {
    const next = { ...data, [key]: !data[key] };
    setData(next);
    await save({ [key]: next[key] });
  }

  async function setStatus(status: ChecklistData["status"]) {
    setData((d) => ({ ...d, status }));
    await save({ status });
  }

  async function save(patch: Partial<ChecklistData>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not save checklist");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">Onboarding Checklist</h2>
        <span className="text-xs font-semibold text-saveo-emerald-700/50">{completedCount}/{ITEMS.length} complete</span>
      </div>
      <ul className="space-y-2">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={data[item.key]}
                onChange={() => toggle(item.key)}
                disabled={saving}
                className="accent-saveo-emerald-700"
              />
              {item.label}
              {data[item.key] && <CheckCircle2 className="h-3.5 w-3.5 text-saveo-emerald-600" />}
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-black/5 pt-4">
        <p className="mb-2 text-xs font-semibold text-saveo-emerald-700/50">Review Decision</p>
        <div className="flex gap-2">
          <button
            onClick={() => setStatus("APPROVED")}
            disabled={saving}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              data.status === "APPROVED" ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatus("REJECTED")}
            disabled={saving}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              data.status === "REJECTED" ? "bg-red-600 text-white" : "bg-black/5 text-saveo-emerald-700/70"
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatus("PENDING_REVIEW")}
            disabled={saving}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              data.status === "PENDING_REVIEW" ? "bg-amber-500 text-white" : "bg-black/5 text-saveo-emerald-700/70"
            }`}
          >
            Pending Review
          </button>
        </div>
      </div>
    </section>
  );
}
