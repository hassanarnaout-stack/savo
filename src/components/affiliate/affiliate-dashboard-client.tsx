"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, TrendingUp, Users, Wallet } from "lucide-react";
import { useLocale } from "next-intl";
import { buildAffiliateShareUrl } from "@/lib/affiliate-share";

interface Dashboard {
  account: { referralCode: string; commissionRate: number; totalEarned: string; totalWithdrawn: string };
  clickCount: number;
  confirmedCount: number;
  pendingCount: number;
  confirmedRevenue: number;
  availableBalance: number;
  milestones: { ruleId: string }[];
  activeRules: { id: string; name: string; metric: string; threshold: number; giftCardAmount: string; newCommissionRate: number | null }[];
  referrals: { id: string; commissionAmount: string; status: string; createdAt: string; order: { orderNumber: string } }[];
}

export function AffiliateDashboardClient({ hasAccount }: { hasAccount: boolean }) {
  const locale = useLocale();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchDashboard() {
    const res = await fetch("/api/affiliate/dashboard");
    const data = await res.json();
    if (res.ok) setDashboard(data);
    setLoading(false);
  }

  useEffect(() => {
    if (hasAccount) fetchDashboard();
    else setLoading(false);
  }, [hasAccount]);

  async function joinProgram() {
    setSaving(true);
    try {
      const res = await fetch("/api/affiliate/dashboard", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("You're now a Savo Affiliate!");
      window.location.reload();
    } catch {
      toast.error("Could not join the affiliate program");
    } finally {
      setSaving(false);
    }
  }

  async function requestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/affiliate/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Withdrawal requested");
      setWithdrawAmount("");
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message ?? "Could not request withdrawal");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  if (!hasAccount) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <TrendingUp className="mx-auto mb-3 h-12 w-12 text-saveo-emerald-700" />
        <h1 className="mb-2 text-2xl font-black text-saveo-emerald-700">Become a Savo Affiliate</h1>
        <p className="mb-6 text-sm text-saveo-emerald-700/50">Earn commission on every order you refer. Free to join.</p>
        <button onClick={joinProgram} disabled={saving} className="btn-primary">Join the Program</button>
      </div>
    );
  }

  if (!dashboard) return null;
  const referralLink = typeof window !== "undefined" ? buildAffiliateShareUrl({ origin: window.location.origin, locale, referralCode: dashboard.account.referralCode }) : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-saveo-emerald-700">Affiliate Dashboard</h1>

      <div className="mb-6 rounded-xl2 bg-gradient-to-br from-saveo-emerald-800 to-saveo-emerald-700 p-6 text-white">
        <p className="mb-1 text-xs text-white/60">Your Referral Link</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate rounded-lg bg-white/10 px-3 py-2 text-sm">{referralLink}</p>
          <button
            onClick={() => { navigator.clipboard.writeText(referralLink); toast.success("Copied!"); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"
            aria-label="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-white/50">Or share your code: <span className="font-bold text-saveo-gold-400">{dashboard.account.referralCode}</span></p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-saveo-emerald-700/40" />
          <p className="text-xl font-black">{dashboard.clickCount}</p>
          <p className="text-xs text-saveo-emerald-700/50">Clicks</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-black">{dashboard.confirmedCount}</p>
          <p className="text-xs text-saveo-emerald-700/50">Confirmed Orders</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-black">{dashboard.pendingCount}</p>
          <p className="text-xs text-saveo-emerald-700/50">Pending</p>
        </div>
        <div className="card p-4 text-center">
          <Wallet className="mx-auto mb-1 h-5 w-5 text-saveo-emerald-700/40" />
          <p className="text-xl font-black text-saveo-emerald-700">{dashboard.availableBalance.toFixed(3)}</p>
          <p className="text-xs text-saveo-emerald-700/50">Available (KD)</p>
        </div>
      </div>

      {dashboard.activeRules.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="font-bold text-saveo-emerald-700">🏆 Milestone Rewards</h2>
          {dashboard.activeRules.map((rule) => {
            const achieved = dashboard.milestones.some((ms) => ms.ruleId === rule.id);
            const progress = rule.metric === "REFERRAL_COUNT" ? dashboard.confirmedCount : dashboard.confirmedRevenue;
            const percent = Math.min(100, (progress / rule.threshold) * 100);
            const rewardLabel = `${Number(rule.giftCardAmount).toFixed(3)} KD gift${rule.newCommissionRate ? ` + ${rule.newCommissionRate}% rate` : ""}`;
            return (
              <div key={rule.id} className="card p-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold">{achieved ? "✅" : "🔒"} {rule.name}</span>
                  <span className="text-saveo-emerald-700/50">{rewardLabel}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                  <div className={`h-full rounded-full ${achieved ? "bg-saveo-gold-400" : "bg-saveo-emerald-600"}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={requestWithdrawal} className="mb-6 card flex gap-2 p-4">
        <input
          type="number" step="0.001" min="0" max={dashboard.availableBalance}
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          placeholder="Amount to withdraw"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={saving} className="btn-primary text-sm">Request Withdrawal</button>
      </form>

      <h2 className="mb-3 font-bold text-saveo-emerald-700">Referral History</h2>
      <div className="space-y-1.5">
        {dashboard.referrals.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-black/5 bg-white p-2.5 text-xs">
            <span>Order #{r.order.orderNumber}</span>
            <span className="font-semibold">{Number(r.commissionAmount).toFixed(3)} KD · {r.status}</span>
          </div>
        ))}
        {dashboard.referrals.length === 0 && <p className="text-center text-xs text-saveo-emerald-700/40">No referrals yet — share your link!</p>}
      </div>
    </div>
  );
}
