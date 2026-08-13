"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gift, Copy } from "lucide-react";

const PRESET_AMOUNTS = [10, 25, 50, 100];

export default function GiftCardsPage() {
  const [amount, setAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    const finalAmount = customAmount ? parseFloat(customAmount) : amount;
    if (!finalAmount || finalAmount < 5 || finalAmount > 200) return toast.error("Amount must be between 5 and 200 KD");

    setSaving(true);
    try {
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          recipientEmail: recipientEmail || undefined,
          recipientName: recipientName || undefined,
          personalMessage: personalMessage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not purchase gift card");
      setPurchasedCode(data.code);
      toast.success("Gift card created!");
    } catch (err: any) {
      toast.error(err.message ?? "Could not purchase gift card");
    } finally {
      setSaving(false);
    }
  }

  if (purchasedCode) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <div className="overflow-hidden rounded-xl2 bg-gradient-to-br from-saveo-emerald-800 to-saveo-emerald-700 p-8 text-white">
          <Gift className="mx-auto mb-3 h-12 w-12 text-saveo-gold-400" />
          <p className="mb-1 text-sm text-white/60">Your Savo Gift Card</p>
          <p className="mb-4 text-2xl font-black tracking-wide text-saveo-gold-400">{purchasedCode}</p>
          <button
            onClick={() => { navigator.clipboard.writeText(purchasedCode); toast.success("Copied!"); }}
            className="mx-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
          >
            <Copy className="h-4 w-4" /> Copy Code
          </button>
        </div>
        <p className="mt-4 text-sm text-saveo-emerald-700/60">
          {recipientEmail ? `We recommend sharing this code with ${recipientEmail} directly.` : "Save this code — it's redeemable at checkout."}
        </p>
        <button onClick={() => setPurchasedCode(null)} className="btn-outline mt-6 text-sm">Buy Another</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="mb-6 text-center">
        <Gift className="mx-auto mb-2 h-10 w-10 text-saveo-emerald-700" />
        <h1 className="text-2xl font-black text-saveo-emerald-700">Savo Gift Cards</h1>
        <p className="mt-1 text-sm text-saveo-emerald-700/50">Give the gift of savings — redeemable on any order.</p>
        <a href="/gift-cards/check" className="mt-2 inline-block text-xs font-semibold text-saveo-emerald-600 underline">
          Already have a gift card? Check your balance →
        </a>
      </div>

      <form onSubmit={handlePurchase} className="card space-y-4 p-6">
        <div>
          <label className="mb-2 block text-sm font-semibold">Amount (KD)</label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => { setAmount(a); setCustomAmount(""); }}
                className={`rounded-lg border py-2 text-sm font-bold ${!customAmount && amount === a ? "border-saveo-emerald-700 bg-saveo-emerald-50 text-saveo-emerald-700" : "border-black/10"}`}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="number" min="5" max="200" step="0.5"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Or enter a custom amount (5–200 KD)"
            className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
        </div>

        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="Recipient's email (optional)"
          className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
        />
        <input
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Recipient's name (optional)"
          className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
        />
        <textarea
          value={personalMessage}
          onChange={(e) => setPersonalMessage(e.target.value)}
          placeholder="Personal message (optional)"
          rows={2}
          maxLength={500}
          className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
        />

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Creating..." : "Buy Gift Card"}
        </button>
        <p className="text-center text-xs text-saveo-emerald-700/40">Valid for 365 days from purchase.</p>
      </form>
    </div>
  );
}
