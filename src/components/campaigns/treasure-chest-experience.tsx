"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gift, Percent, Truck, Coins, Wallet, Ticket, Sparkles } from "lucide-react";
import { AuraGlowCard } from "@/components/ui/aura-glow-card";

const REWARD_ICONS: Record<string, any> = {
  DISCOUNT: Percent,
  FREE_DELIVERY: Truck,
  POINTS: Coins,
  CREDIT: Wallet,
  MYSTERY_BOX: Gift,
  GOLDEN_TICKET: Ticket,
};

interface RewardData {
  rewardType: string;
  label: string;
  value: number | null;
  promoCode: string | null;
}

export function TreasureChestExperience({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [alreadyOpened, setAlreadyOpened] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [available, setAvailable] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [description, setDescription] = useState<{ en: string | null; ar: string | null }>({ en: null, ar: null });

  useEffect(() => {
    fetch("/api/campaigns/treasure/status")
      .then((r) => r.json())
      .then((data) => {
        setAvailable(data.available);
        setAlreadyOpened(data.alreadyOpenedToday);
        if (data.campaign) {
          setDescription({ en: data.campaign.customerDescription, ar: data.campaign.customerDescriptionAr });
        }
        if (data.todaysReward) {
          setReward(data.todaysReward);
          setRevealed(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleOpen() {
    setOpening(true);
    try {
      const res = await fetch("/api/campaigns/treasure/open", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open the chest");
      setReward(data.reward);
      setTimeout(() => setRevealed(true), 900); // brief suspense before the reveal
      setAlreadyOpened(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not open the chest");
    } finally {
      setOpening(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-saveo-emerald-700/40">Loading...</div>;
  }

  if (!available) {
    return (
      <div className="py-20">
        <Gift className="mx-auto h-12 w-12 text-saveo-emerald-700/20" />
        <p className="mt-4 text-saveo-emerald-700/50">Treasure Chest isn't available right now — check back soon!</p>
      </div>
    );
  }

  const RewardIcon = reward ? REWARD_ICONS[reward.rewardType] ?? Gift : Gift;

  return (
    <div>
      <h1 className="text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🎁 صندوق كنز اليوم" : "🎁 Today's Treasure Chest"}
      </h1>
      <p className="mt-1 text-sm text-saveo-emerald-700/50">
        {locale === "ar"
          ? (description.ar || "افتح مرة واحدة كل يوم واربح جائزة!")
          : (description.en || "Open once a day and win a real reward!")}
      </p>

      <div className="my-10 flex justify-center">
        <AuraGlowCard className="w-fit rounded-full">
          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-saveo-gold-400 to-saveo-gold-600 shadow-xl transition-transform ${
              opening ? "animate-bounce" : ""
            }`}
          >
            {alreadyOpened && revealed && reward ? (
              <RewardIcon className="h-16 w-16 text-saveo-emerald-900" />
            ) : (
              <Gift className="h-16 w-16 text-saveo-emerald-900" />
            )}
          </div>
        </AuraGlowCard>
      </div>

      {alreadyOpened && revealed && reward ? (
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
            {locale === "ar" ? "رجّع بكرة لفرصة جديدة!" : "Come back tomorrow for another chance!"}
          </p>
        </div>
      ) : alreadyOpened && !revealed ? (
        <p className="text-saveo-emerald-700/50">{locale === "ar" ? "..جاري الكشف" : "Revealing..."}</p>
      ) : (
        <button onClick={handleOpen} disabled={opening} className="btn-primary px-8">
          {opening ? (locale === "ar" ? "جاري الفتح..." : "Opening...") : locale === "ar" ? "افتح الصندوق" : "Open the Chest"}
        </button>
      )}
    </div>
  );
}
