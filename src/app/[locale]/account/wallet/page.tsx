import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { WalletService } from "@/lib/services/wallet-service";
import { LoyaltyService } from "@/lib/services/loyalty-service";
import { formatKWD } from "@/lib/utils";
import { RedeemPointsForm } from "@/components/account/redeem-points-form";

/**
 * SAVO Wallet & Points — exact V22 visual transplant for the top two
 * stat cards (AccountPage 'wallet' section, V22 CustomerPages.tsx:
 * teal wallet-balance card + gold points card). V22 stops there — the
 * real production system is actually richer (real transaction history
 * for both wallet and points, plus a real point-redemption action),
 * so per "do not remove functional production areas the Figma demo
 * lacks", those sections are kept and adapted to the same V22 design
 * language rather than dropped. ALL business logic below is
 * byte-for-byte unchanged: same WalletService/LoyaltyService calls,
 * same RedeemPointsForm (real /api/account/redeem-points call).
 */
export default async function WalletPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/wallet");

  const [wallet, walletHistory, points, pointsHistory, locale] = await Promise.all([
    WalletService.getOrCreateWallet(session.user.id),
    WalletService.getHistory(session.user.id, 20),
    LoyaltyService.getOrCreateAccount(session.user.id),
    LoyaltyService.getHistory(session.user.id, 20),
    getLocale(),
  ]);

  const isArabic = locale === "ar";

  return (
    <div className="savo-wallet-page">
      <h1 className="savo-wallet-title">{isArabic ? "المحفظة والنقاط" : "Wallet & Points"}</h1>

      <div className="savo-wallet-stats">
        <div className="savo-wallet-stat savo-wallet-stat--teal">
          <p className="savo-wallet-stat-label">{isArabic ? "رصيد المحفظة" : "Wallet balance"}</p>
          <p className="savo-wallet-stat-value">{formatKWD(Number(wallet.balance))}</p>
          <p className="savo-wallet-stat-sub">{isArabic ? "متاح للاستخدام" : "Available to use"}</p>
        </div>
        <div className="savo-wallet-stat savo-wallet-stat--gold">
          <p className="savo-wallet-stat-label">{isArabic ? "نقاط سافو" : "SAVO Points"}</p>
          <p className="savo-wallet-stat-value">{points.points.toLocaleString()}</p>
          <p className="savo-wallet-stat-sub">{isArabic ? `مدى الحياة: ${points.lifetimePoints}` : `Lifetime: ${points.lifetimePoints} pts`}</p>
        </div>
      </div>

      <div className="savo-wallet-card">
        <RedeemPointsForm availablePoints={points.points} />
      </div>

      <section className="savo-wallet-card">
        <h2 className="savo-wallet-section-title">{isArabic ? "سجل المحفظة" : "Wallet History"}</h2>
        <div className="savo-wallet-history">
          {walletHistory.map((t) => (
            <div key={t.id} className="savo-wallet-history-row">
              <span>{t.reason}</span>
              <span className={t.type === "CREDIT" ? "savo-wallet-credit" : "savo-wallet-debit"}>
                {t.type === "CREDIT" ? "+" : "−"}{formatKWD(Number(t.amount))}
              </span>
            </div>
          ))}
          {walletHistory.length === 0 && <p className="savo-wallet-empty">{isArabic ? "صفر نشاط بالمحفظة بعد." : "No wallet activity yet."}</p>}
        </div>
      </section>

      <section className="savo-wallet-card">
        <h2 className="savo-wallet-section-title">{isArabic ? "سجل النقاط" : "Points History"}</h2>
        <div className="savo-wallet-history">
          {pointsHistory.map((t) => (
            <div key={t.id} className="savo-wallet-history-row">
              <span>{t.reason}</span>
              <span className={t.type === "EARNED" ? "savo-wallet-credit" : "savo-wallet-debit"}>
                {t.type === "EARNED" ? "+" : "−"}{t.points} pts
              </span>
            </div>
          ))}
          {pointsHistory.length === 0 && <p className="savo-wallet-empty">{isArabic ? "صفر نشاط بالنقاط بعد." : "No points activity yet."}</p>}
        </div>
      </section>
    </div>
  );
}
