"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gift, Sparkles, HelpCircle } from "lucide-react";
import { AuraGlowCard } from "@/components/ui/aura-glow-card";

interface RewardData {
  rewardType: string;
  label: string;
  value: number | null;
  promoCode: string | null;
  allThree?: string[];
}

export function PickThreeExperience({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [numTiles, setNumTiles] = useState(9);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [picking, setPicking] = useState(false);
  const [description, setDescription] = useState<{ en: string | null; ar: string | null }>({ en: null, ar: null });

  useEffect(() => {
    fetch("/api/campaigns/pick-three/status")
      .then((r) => r.json())
      .then((data) => {
        setAvailable(data.available);
        setNumTiles(data.numTiles ?? 9);
        setAlreadyPlayed(data.alreadyPlayedToday);
        if (data.campaign) {
          setDescription({ en: data.campaign.customerDescription, ar: data.campaign.customerDescriptionAr });
        }
        if (data.todaysReward) setReward(data.todaysReward);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePick() {
    setPicking(true);
    try {
      const res = await fetch("/api/campaigns/pick-three/pick", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not pick");
      setReward(data.reward);
      setAlreadyPlayed(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not pick");
    } finally {
      setPicking(false);
    }
  }

  if (loading) return <div className="py-20 text-saveo-emerald-700/40">Loading...</div>;

  if (!available) {
    return (
      <div className="py-20">
        <Gift className="mx-auto h-12 w-12 text-saveo-emerald-700/20" />
        <p className="mt-4 text-saveo-emerald-700/50">Pick Three isn't available right now — check back soon!</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🎲 اختر ثلاثة" : "🎲 Pick Three"}
      </h1>
      <p className="mt-1 text-sm text-saveo-emerald-700/50">
        {locale === "ar"
          ? (description.ar || "اضغط لتكشف ثلاث مفاجآت — أفضلها تكون جائزتك")
          : (description.en || "Tap to reveal three surprises — the best one becomes your reward")}
      </p>

      <div className="my-8 grid grid-cols-3 gap-3">
        {Array.from({ length: numTiles }).map((_, i) => {
          const isRevealed = alreadyPlayed && i < 3;
          return (
            <AuraGlowCard key={i} className="rounded-xl2">
              <button
                onClick={!alreadyPlayed ? handlePick : undefined}
                disabled={picking || alreadyPlayed}
                className="flex aspect-square w-full items-center justify-center rounded-xl2 bg-gradient-to-br from-saveo-emerald-700 to-saveo-emerald-900 shadow-lg"
              >
                {isRevealed && reward?.allThree ? (
                  <span className="px-1 text-center text-[10px] font-bold text-saveo-gold-300">{reward.allThree[i]}</span>
                ) : (
                  <HelpCircle className="h-6 w-6 text-saveo-gold-400/60" />
                )}
              </button>
            </AuraGlowCard>
          );
        })}
      </div>

      {alreadyPlayed && reward ? (
        <div className="rounded-xl2 bg-saveo-emerald-50 p-5">
          <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-saveo-emerald-700">
            <Sparkles className="h-4 w-4 text-saveo-gold-500" /> {locale === "ar" ? "أفضل جائزة حصلت عليها:" : "Your best reward:"}
          </p>
          <p className="mt-1 text-lg font-black text-saveo-emerald-800">{reward.label}</p>
          {reward.promoCode && (
            <p className="mt-2 rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-bold text-saveo-emerald-700">
              {reward.promoCode}
            </p>
          )}
          <p className="mt-4 text-xs text-saveo-emerald-700/40">
            {locale === "ar" ? "رجّع بكرة لفرصة جديدة!" : "Come back tomorrow for another chance!"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-saveo-emerald-700/40">
          {picking ? (locale === "ar" ? "..جاري الكشف" : "Revealing...") : locale === "ar" ? "اضغط أي مربع للبدء" : "Tap any tile to start"}
        </p>
      )}
    </div>
  );
}
