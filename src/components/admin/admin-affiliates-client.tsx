"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatKWD } from "@/lib/utils";

interface Affiliate {
  id: string;
  referralCode: string;
  commissionRate: number;
  status: string;
  totalEarned: string;
  totalWithdrawn: string;
  user: { name: string | null; email: string };
  _count: { clicks: number; referrals: number; milestones: number };
}

interface Withdrawal {
  id: string;
  amount: string;
  createdAt: string;
  affiliate: { referralCode: string; user: { name: string | null; email: string } };
}

interface MilestoneRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  giftCardAmount: string;
  newCommissionRate: number | null;
  isActive: boolean;
}

export function AdminAffiliatesClient() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rateEdits, setRateEdits] = useState<Record<string, string>>({});
  const [programEnabled, setProgramEnabled] = useState<boolean | null>(null);
  const [rules, setRules] = useState<MilestoneRule[]>([]);
  const [showNewRule, setShowNewRule] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", metric: "REFERRAL_COUNT", threshold: "", giftCardAmount: "", newCommissionRate: "" });

  async function fetchData() {
    const res = await fetch("/api/admin/affiliates");
    const data = await res.json();
    if (res.ok) {
      setAffiliates(data.affiliates);
      setWithdrawals(data.pendingWithdrawals);
    }
  }

  async function fetchToggle() {
    const res = await fetch("/api/admin/affiliates/toggle");
    const data = await res.json();
    if (res.ok) setProgramEnabled(data.enabled);
  }

  async function fetchRules() {
    const res = await fetch("/api/admin/affiliates/milestone-rules");
    const data = await res.json();
    if (res.ok) setRules(data.rules);
  }

  useEffect(() => {
    fetchData();
    fetchToggle();
    fetchRules();
  }, []);

  async function toggleProgram() {
    if (programEnabled === null) return;
    setBusy("toggle");
    try {
      const res = await fetch("/api/admin/affiliates/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !programEnabled }),
      });
      if (!res.ok) throw new Error();
      setProgramEnabled(!programEnabled);
      toast.success(!programEnabled ? "Affiliate program enabled" : "Affiliate program paused — hidden from customers");
    } catch {
      toast.error("Could not update program status");
    } finally {
      setBusy(null);
    }
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newRule.name || !newRule.threshold) return;
    setBusy("new-rule");
    try {
      const res = await fetch("/api/admin/affiliates/milestone-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRule.name,
          metric: newRule.metric,
          threshold: parseFloat(newRule.threshold),
          giftCardAmount: parseFloat(newRule.giftCardAmount) || 0,
          newCommissionRate: newRule.newCommissionRate ? parseFloat(newRule.newCommissionRate) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Milestone rule created");
      setNewRule({ name: "", metric: "REFERRAL_COUNT", threshold: "", giftCardAmount: "", newCommissionRate: "" });
      setShowNewRule(false);
      fetchRules();
    } catch {
      toast.error("Could not create rule");
    } finally {
      setBusy(null);
    }
  }

  async function deactivateRule(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/affiliates/milestone-rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Rule deactivated");
      fetchRules();
    } catch {
      toast.error("Could not deactivate rule");
    } finally {
      setBusy(null);
    }
  }

  async function handleWithdrawal(id: string, action: "APPROVE" | "REJECT") {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/affiliates/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "APPROVE" ? "Withdrawal paid" : "Withdrawal rejected");
      fetchData();
    } catch {
      toast.error("Could not update withdrawal");
    } finally {
      setBusy(null);
    }
  }

  async function saveRate(id: string) {
    const rate = parseFloat(rateEdits[id]);
    if (isNaN(rate)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/affiliates/${id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: rate }),
      });
      if (!res.ok) throw new Error();
      toast.success("Commission rate updated");
      setRateEdits((prev) => { const next = { ...prev }; delete next[id]; return next; });
      fetchData();
    } catch {
      toast.error("Could not update rate");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Affiliate Program</h1>
        {programEnabled !== null && (
          <button
            onClick={toggleProgram}
            disabled={busy === "toggle"}
            className={`rounded-full px-4 py-2 text-xs font-bold ${programEnabled ? "bg-red-100 text-red-700" : "bg-saveo-emerald-600 text-white"}`}
          >
            {programEnabled ? "⏸ Pause Program" : "▶ Enable Program"}
          </button>
        )}
      </div>
      {programEnabled === false && (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
          The program is currently paused — hidden from customers, no new clicks or referrals are tracked. Existing balances and pending withdrawals are unaffected.
        </p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Pending Withdrawals</h2>
        <div className="space-y-2">
          {withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl2 border border-black/5 bg-white p-4">
              <div>
                <p className="text-sm font-semibold">{w.affiliate.user.name ?? w.affiliate.user.email}</p>
                <p className="text-xs text-saveo-emerald-700/50">{w.affiliate.referralCode} · {formatKWD(Number(w.amount))}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => handleWithdrawal(w.id, "APPROVE")} disabled={busy === w.id} className="btn-primary !py-1.5 text-xs">Pay</button>
                <button onClick={() => handleWithdrawal(w.id, "REJECT")} disabled={busy === w.id} className="text-xs font-semibold text-red-600">Reject</button>
              </div>
            </div>
          ))}
          {withdrawals.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No pending withdrawals.</p>}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-saveo-emerald-700">Milestone Rules</h2>
          <button onClick={() => setShowNewRule(!showNewRule)} className="text-xs font-semibold text-saveo-emerald-600">+ Add Rule</button>
        </div>

        {showNewRule && (
          <form onSubmit={createRule} className="mb-3 card grid gap-2 p-4 sm:grid-cols-5">
            <input value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} placeholder="Name (e.g. 50 Referrals)" className="input text-xs sm:col-span-2" />
            <select value={newRule.metric} onChange={(e) => setNewRule({ ...newRule, metric: e.target.value })} className="input text-xs">
              <option value="REFERRAL_COUNT">Referral Count</option>
              <option value="REVENUE">Revenue (KD)</option>
            </select>
            <input type="number" value={newRule.threshold} onChange={(e) => setNewRule({ ...newRule, threshold: e.target.value })} placeholder="Threshold" className="input text-xs" />
            <input type="number" step="0.001" value={newRule.giftCardAmount} onChange={(e) => setNewRule({ ...newRule, giftCardAmount: e.target.value })} placeholder="Gift (KD)" className="input text-xs" />
            <input type="number" step="0.1" value={newRule.newCommissionRate} onChange={(e) => setNewRule({ ...newRule, newCommissionRate: e.target.value })} placeholder="New rate % (optional)" className="input text-xs" />
            <button type="submit" disabled={busy === "new-rule"} className="btn-primary text-xs sm:col-span-5">Create Rule</button>
          </form>
        )}

        <div className="space-y-1.5">
          {rules.map((r) => (
            <div key={r.id} className={`flex items-center justify-between rounded-lg border p-3 text-xs ${r.isActive ? "border-black/5 bg-white" : "border-black/5 bg-black/[0.02] opacity-50"}`}>
              <div>
                <p className="font-semibold">{r.name} {!r.isActive && "(inactive)"}</p>
                <p className="text-saveo-emerald-700/50">
                  {r.metric === "REFERRAL_COUNT" ? `${r.threshold} referrals` : `${formatKWD(r.threshold)} revenue`} → {formatKWD(Number(r.giftCardAmount))} gift
                  {r.newCommissionRate ? ` + ${r.newCommissionRate}% rate` : ""}
                </p>
              </div>
              {r.isActive && (
                <button onClick={() => deactivateRule(r.id)} disabled={busy === r.id} className="font-semibold text-red-600">Deactivate</button>
              )}
            </div>
          ))}
          {rules.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No milestone rules yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-saveo-emerald-700">All Affiliates</h2>
        <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-start text-xs text-saveo-emerald-700/50">
                <th className="p-3 text-start">Affiliate</th>
                <th className="p-3 text-start">Code</th>
                <th className="p-3 text-start">Clicks</th>
                <th className="p-3 text-start">Referrals</th>
                <th className="p-3 text-start">Rate</th>
                <th className="p-3 text-start">Milestones</th>
                <th className="p-3 text-start">Earned</th>
                <th className="p-3 text-start">Withdrawn</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-b border-black/5">
                  <td className="p-3">{a.user.name ?? a.user.email}</td>
                  <td className="p-3 font-mono text-xs">{a.referralCode}</td>
                  <td className="p-3">{a._count.clicks}</td>
                  <td className="p-3">{a._count.referrals}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" max="50"
                        value={rateEdits[a.id] ?? a.commissionRate}
                        onChange={(e) => setRateEdits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        className="w-16 rounded border border-black/10 px-1.5 py-1 text-xs"
                      />
                      <span className="text-xs">%</span>
                      {rateEdits[a.id] !== undefined && parseFloat(rateEdits[a.id]) !== a.commissionRate && (
                        <button onClick={() => saveRate(a.id)} disabled={busy === a.id} className="text-xs font-bold text-saveo-emerald-600">Save</button>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">{a._count.milestones > 0 ? `🏆 ${a._count.milestones}` : "—"}</td>
                  <td className="p-3 font-semibold">{formatKWD(Number(a.totalEarned))}</td>
                  <td className="p-3">{formatKWD(Number(a.totalWithdrawn))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {affiliates.length === 0 && <p className="p-6 text-center text-sm text-saveo-emerald-700/40">No affiliates yet.</p>}
        </div>
      </section>
    </div>
  );
}
