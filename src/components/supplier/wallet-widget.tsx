"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKWD } from "@/lib/utils";

export function WalletWidget({ balance, pendingAmount, paidAmount }: { balance: number; pendingAmount: number; paidAmount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      const res = await fetch("/api/supplier/wallet/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not request payout");
      toast.success("Payout requested — awaiting admin approval");
      setAmount("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not request payout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="card p-4">
        <p className="text-xs text-saveo-emerald-700/50">Available Balance</p>
        <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(balance)}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-saveo-emerald-700/50">Pending Withdrawal</p>
        <p className="text-2xl font-black text-amber-600">{formatKWD(pendingAmount)}</p>
      </div>
      <div className="card space-y-2 p-4">
        <p className="text-xs text-saveo-emerald-700/50">Request Payout</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="number" step="0.001" min="0" max={balance}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (KD)"
            className="input text-sm"
          />
          <button type="submit" disabled={saving} className="btn-primary !py-2 text-xs">Request</button>
        </form>
      </div>
    </div>
  );
}
