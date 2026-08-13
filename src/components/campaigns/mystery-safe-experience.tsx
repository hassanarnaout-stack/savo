"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, LockOpen, Percent, Truck, Coins, Wallet, Ticket, Sparkles, KeyRound } from "lucide-react";

const REWARD_ICONS: Record<string, any> = {
  DISCOUNT: Percent,
  FREE_DELIVERY: Truck,
  POINTS: Coins,
  CREDIT: Wallet,
  GOLDEN_TICKET: Ticket,
};

interface RewardData {
  rewardType: string;
  label: string;
  value: number | null;
  promoCode: string | null;
}

export function MysterySafeExperience({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [available, setAvailable] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [alreadyOpened, setAlreadyOpened] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [description, setDescription] = useState<{ en: string | null; ar: string | null }>({ en: null, ar: null });

  useEffect(() => {
    fetch("/api/campaigns/mystery-safe/status")
      .then((r) => r.json())
      .then((data) => {
        setAvailable(data.available);
        setHasKey(data.hasKey);
        setAlreadyOpened(data.alreadyOpenedToday);
        if (data.todaysReward) setReward(data.todaysReward);
        if (data.campaign) {
          setDescription({ en: data.campaign.customerDescription, ar: data.campaign.customerDescriptionAr });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleOpen() {
    setOpening(true);
    try {
      const res = await fetch("/api/campaigns/mystery-safe/open", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open the safe");
      setReward(data.reward);
      setAlreadyOpened(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not open the safe");
    } finally {
      setOpening(false);
    }
  }

  if (loading) return <div className="py-20 text-saveo-emerald-700/40">Loading...</div>;

  if (!available) {
    return (
      <div className="py-20">
        <Lock className="mx-auto h-12 w-12 text-saveo-emerald-700/20" />
        <p className="mt-4 text-saveo-emerald-700/50">Mystery Safe isn't available right now — check back soon!</p>
      </div>
    );
  }

  const RewardIcon = reward ? REWARD_ICONS[reward.rewardType] ?? LockOpen : LockOpen;

  return (
    <div>
      <h1 className="text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🔐 خزنة الغموض" : "🔐 Mystery Safe"}
      </h1>
      <p className="mt-1 text-sm text-saveo-emerald-700/50">
        {locale === "ar"
          ? (description.ar || "اجمع مفتاح يومي من تسجيل الدخول أو الشراء أو التقييم أو الإحالة")
          : (description.en || "Earn a Daily Key from logging in, purchasing, reviewing, or referring a friend")}
      </p>

      <div className="my-10 flex justify-center">
        <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-saveo-emerald-700 to-saveo-emerald-900 shadow-xl">
          {alreadyOpened && reward ? (
            <RewardIcon className="h-16 w-16 text-saveo-gold-400" />
          ) : (
            <Lock className="h-16 w-16 text-saveo-gold-400" />
          )}
        </div>
      </div>

      {alreadyOpened && reward ? (
        <div>
          <div className="rounded-xl2 bg-saveo-emerald-50 p-5">
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-saveo-emerald-700">
              <Sparkles className="h-4 w-4 text-saveo-gold-500" /> {locale === "ar" ? "مبروك!" : "Congratulations!"}
            </p>
            <p className="mt-1 text-lg font-black text-saveo-emerald-800">{reward.label}</p>
            {reward.promoCode && (
              <p className="mt-2 rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-bold text-saveo-emerald-700">
                {reward.promoCode}
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-saveo-emerald-700/40">
            {locale === "ar" ? "رجّع بكرة بمفتاح جديد!" : "Come back tomorrow with a new key!"}
          </p>
        </div>
      ) : hasKey ? (
        <button onClick={handleOpen} disabled={opening} className="btn-primary px-8">
          <KeyRound className="h-4 w-4" />
          {opening ? (locale === "ar" ? "جاري الفتح..." : "Opening...") : locale === "ar" ? "افتح الخزنة" : "Open the Safe"}
        </button>
      ) : (
        <div className="rounded-xl2 bg-black/[0.03] p-5">
          <p className="text-sm text-saveo-emerald-700/60">
            {locale === "ar"
              ? "ما عندك مفتاح اليوم بعد — سجّل دخول أو أكمل طلب لتحصل على واحد!"
              : "No key yet today — log in or complete an order to earn one!"}
          </p>
        </div>
      )}
    </div>
  );
}
