"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SubscribeAndSaveWidget({ productId, saveoPrice, locale }: { productId: string; saveoPrice: number; locale: string }) {
  const router = useRouter();
  const [frequency, setFrequency] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("MONTHLY");
  const [saving, setSaving] = useState(false);
  const discountedPrice = saveoPrice * 0.9;

  async function handleSubscribe() {
    setSaving(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1, frequency }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not create subscription");
      }
      toast.success("Subscribed! Manage it anytime from your account.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not create subscription");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-saveo-emerald-200 bg-saveo-emerald-50 p-4">
      <p className="text-sm font-bold text-saveo-emerald-700">
        {locale === "ar" ? "🔄 اشترك ووفّر 10%" : "🔄 Subscribe & Save 10%"}
      </p>
      <p className="text-xs text-saveo-emerald-700/60">
        {locale === "ar" ? `${discountedPrice.toFixed(3)} د.ك بدل ${saveoPrice.toFixed(3)} د.ك` : `${discountedPrice.toFixed(3)} KD instead of ${saveoPrice.toFixed(3)} KD`}
      </p>
      <div className="mt-2 flex gap-2">
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="input text-xs">
          <option value="WEEKLY">Weekly</option>
          <option value="BIWEEKLY">Every 2 weeks</option>
          <option value="MONTHLY">Monthly</option>
        </select>
        <button onClick={handleSubscribe} disabled={saving} className="btn-primary !py-1.5 text-xs">
          {saving ? "..." : "Subscribe"}
        </button>
      </div>
    </div>
  );
}
