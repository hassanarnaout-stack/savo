"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface CompetitorPriceEntry {
  id: string;
  competitorName: string;
  price: number;
}

export function CompetitorPriceManager({
  productId,
  existing,
  source,
}: {
  productId: string;
  existing: CompetitorPriceEntry[];
  source: "REAL" | "CATEGORY_AVERAGE";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [competitorName, setCompetitorName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!competitorName.trim() || !price) return toast.error("Enter a competitor name and price");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/competitor-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, competitorName: competitorName.trim(), price: parseFloat(price) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Competitor price saved");
      setCompetitorName("");
      setPrice("");
      router.refresh();
    } catch {
      toast.error("Could not save competitor price");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: string) {
    try {
      const res = await fetch(`/api/admin/competitor-prices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed");
      router.refresh();
    } catch {
      toast.error("Could not remove");
    }
  }

  return (
    <div className="mt-2 border-t border-black/5 pt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-semibold text-saveo-emerald-600">
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {source === "REAL" ? `Competitor prices (${existing.length})` : "Add real competitor prices"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {existing.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs">
              <span>{c.competitorName}: {c.price.toFixed(3)} KD</span>
              <button onClick={() => removeEntry(c.id)} aria-label="Remove">
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </button>
            </div>
          ))}
          <form onSubmit={addEntry} className="flex gap-1.5">
            <input value={competitorName} onChange={(e) => setCompetitorName(e.target.value)} placeholder="Competitor name" className="input text-xs" />
            <input type="number" step="0.001" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="input w-24 text-xs" />
            <button type="submit" disabled={saving} className="btn-outline !py-1 text-xs">Add</button>
          </form>
        </div>
      )}
    </div>
  );
}
