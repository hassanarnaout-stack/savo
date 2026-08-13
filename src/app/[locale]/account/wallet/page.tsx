import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WalletService } from "@/lib/services/wallet-service";
import { LoyaltyService } from "@/lib/services/loyalty-service";
import { formatKWD } from "@/lib/utils";
import { RedeemPointsForm } from "@/components/account/redeem-points-form";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/wallet");

  const [wallet, walletHistory, points, pointsHistory] = await Promise.all([
    WalletService.getOrCreateWallet(session.user.id),
    WalletService.getHistory(session.user.id, 20),
    LoyaltyService.getOrCreateAccount(session.user.id),
    LoyaltyService.getHistory(session.user.id, 20),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-saveo-emerald-700">Wallet &amp; Points</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-xs text-saveo-emerald-700/50">Wallet Balance</p>
          <p className="text-2xl font-black text-saveo-emerald-700">{formatKWD(Number(wallet.balance))}</p>
        </div>
        <div className="card edge-glow shadow-luxury p-5">
          <p className="text-xs text-saveo-emerald-700/50">Loyalty Points</p>
          <p className="text-2xl font-black text-saveo-gold-600">{points.points} pts</p>
          <p className="text-xs text-saveo-emerald-700/40">Lifetime: {points.lifetimePoints} pts</p>
        </div>
      </div>

      <div className="mb-6 card p-5">
        <RedeemPointsForm availablePoints={points.points} />
      </div>

      <section className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Wallet History</h2>
        <div className="space-y-1.5 text-sm">
          {walletHistory.map((t) => (
            <div key={t.id} className="flex justify-between">
              <span>{t.reason}</span>
              <span className={t.type === "CREDIT" ? "font-semibold text-saveo-emerald-700" : "font-semibold text-red-600"}>
                {t.type === "CREDIT" ? "+" : "−"}{formatKWD(Number(t.amount))}
              </span>
            </div>
          ))}
          {walletHistory.length === 0 && <p className="text-saveo-emerald-700/40">No wallet activity yet.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Points History</h2>
        <div className="space-y-1.5 text-sm">
          {pointsHistory.map((t) => (
            <div key={t.id} className="flex justify-between">
              <span>{t.reason}</span>
              <span className={t.type === "EARNED" ? "font-semibold text-saveo-emerald-700" : "font-semibold text-red-600"}>
                {t.type === "EARNED" ? "+" : "−"}{t.points} pts
              </span>
            </div>
          ))}
          {pointsHistory.length === 0 && <p className="text-saveo-emerald-700/40">No points activity yet.</p>}
        </div>
      </section>
    </div>
  );
}
