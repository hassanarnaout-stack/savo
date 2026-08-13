"use client";

import { useState } from "react";
import { Search, Wallet } from "lucide-react";

export default function CheckGiftCardPage() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; balance: number; reason?: string } | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch(`/api/gift-cards/check?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, balance: 0, reason: "Could not check gift card right now." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="mb-6 text-center">
        <Wallet className="mx-auto mb-2 h-10 w-10 text-saveo-emerald-700" />
        <h1 className="text-2xl font-black text-saveo-emerald-700">Check Gift Card Balance</h1>
        <p className="mt-1 text-sm text-saveo-emerald-700/50">No account or cart needed — just enter your code.</p>
      </div>

      <form onSubmit={handleCheck} className="card flex gap-2 p-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="SVO-XXXX-XXXX-XXXX"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2.5 text-sm uppercase"
        />
        <button type="submit" disabled={checking} className="btn-primary flex items-center gap-1.5 text-sm">
          <Search className="h-4 w-4" /> {checking ? "Checking..." : "Check"}
        </button>
      </form>

      {result && (
        <div className={`mt-4 rounded-xl2 p-5 text-center ${result.valid ? "bg-saveo-emerald-50" : "bg-red-50"}`}>
          {result.valid ? (
            <>
              <p className="text-xs text-saveo-emerald-700/60">Available Balance</p>
              <p className="text-3xl font-black text-saveo-emerald-700">{result.balance.toFixed(3)} KD</p>
            </>
          ) : (
            <p className="font-semibold text-red-600">{result.reason ?? "Invalid gift card."}</p>
          )}
        </div>
      )}
    </div>
  );
}
