"use client";

import { useState } from "react";
import { formatKWD } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, Plus, AlertTriangle } from "lucide-react";

interface ContentItem {
  id: string;
  probability: string;
  isSpecialItem: boolean;
  poolType: "LOCKED" | "CHOICE";
  possibleProduct: { id: string; name: string; saveoPrice: string };
}

export function MysteryBoxContentsManager({ boxId, boxName, initialContents, initialTotalProbability }: { boxId: string; boxName: string; initialContents: ContentItem[]; initialTotalProbability: number }) {
  const [contents, setContents] = useState(initialContents);
  const [totalProbability, setTotalProbability] = useState(initialTotalProbability);
  const [productId, setProductId] = useState("");
  const [probability, setProbability] = useState("10");
  const [isSpecial, setIsSpecial] = useState(false);
  const [poolType, setPoolType] = useState<"LOCKED" | "CHOICE">("LOCKED");
  const [saving, setSaving] = useState(false);

  async function addContent(e: React.FormEvent) {
    e.preventDefault();
    if (!productId.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${boxId}/mystery-box-contents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ possibleProductId: productId.trim(), probability: Number(probability), isSpecialItem: isSpecial, poolType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product added to pool");
      setProductId("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message ?? "Could not add product");
    } finally {
      setSaving(false);
    }
  }

  async function removeContent(contentId: string, removedProbability: number) {
    try {
      const res = await fetch(`/api/admin/products/${boxId}/mystery-box-contents/${contentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setContents((prev) => prev.filter((c) => c.id !== contentId));
      setTotalProbability((prev) => prev - removedProbability);
      toast.success("Removed from pool");
    } catch {
      toast.error("Could not remove");
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">{boxName}</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">Possible products pool — what a customer might get when they open this box.</p>

      {Math.abs(totalProbability - 100) > 0.01 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-saveo-gold-50 px-3 py-2 text-sm text-saveo-gold-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Probabilities add up to {totalProbability.toFixed(2)}%, not 100% — real odds will be skewed until this is fixed.
        </div>
      )}

      <form onSubmit={addContent} className="mb-6 card grid grid-cols-1 gap-2 p-4 sm:grid-cols-[1fr_90px_110px_auto_auto]">
        <input
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder="Product ID (copy from /admin/products)"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <input
          type="number" step="0.01" min="0.01" max="100"
          value={probability}
          onChange={(e) => setProbability(e.target.value)}
          placeholder="% chance"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <select value={poolType} onChange={(e) => setPoolType(e.target.value as "LOCKED" | "CHOICE")} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
          <option value="LOCKED">Locked (random)</option>
          <option value="CHOICE">Choice (customer picks)</option>
        </select>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs">
          <input type="checkbox" checked={isSpecial} onChange={(e) => setIsSpecial(e.target.checked)} /> Special item
        </label>
        <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-1.5 !py-2 text-sm">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      <p className="mb-2 text-xs font-semibold text-saveo-emerald-700/50">
        Note: the % chance column only applies to Locked items — Choice items don't use probability since the customer picks them directly.
      </p>

      <div className="space-y-2">
        {contents.map((c) => (
          <div key={c.id} className="card flex items-center justify-between p-3">
            <div>
              <p className="font-semibold">{c.possibleProduct.name}
                <span className={`ms-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${c.poolType === "CHOICE" ? "bg-saveo-emerald-100 text-saveo-emerald-700" : "bg-black/5 text-saveo-emerald-700/50"}`}>
                  {c.poolType === "CHOICE" ? "Choice" : "Locked"}
                </span>
                {c.isSpecialItem && <span className="ms-2 rounded-full bg-saveo-gold-100 px-2 py-0.5 text-[10px] font-bold text-saveo-gold-700">Special</span>}
              </p>
              <p className="text-xs text-saveo-emerald-700/50">{c.probability}% chance · worth {formatKWD(c.possibleProduct.saveoPrice)}</p>
            </div>
            <button onClick={() => removeContent(c.id, Number(c.probability))} aria-label="Remove">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ))}
        {contents.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No products in this box's pool yet — add some above.</p>}
      </div>
    </div>
  );
}
