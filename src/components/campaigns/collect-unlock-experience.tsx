"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Stamp, Sparkles, Lock, Unlock } from "lucide-react";
import { AuraGlowCard } from "@/components/ui/aura-glow-card";

interface RewardData {
  type: string;
  label: string;
  value: number | null;
}

export function CollectUnlockExperience({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState(5);
  const [unlocked, setUnlocked] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [description, setDescription] = useState<{ en: string | null; ar: string | null }>({ en: null, ar: null });

  function load() {
    fetch("/api/campaigns/collect-unlock/status")
      .then((r) => r.json())
      .then((data) => {
        setAvailable(data.available);
        setProgress(data.progress ?? 0);
        setTarget(data.target ?? 5);
        setUnlocked(data.unlocked ?? false);
        setReward(data.reward ?? null);
        if (data.campaign) {
          setDescription({ en: data.campaign.customerDescription, ar: data.campaign.customerDescriptionAr });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/campaigns/collect-unlock/unlock", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not unlock");
      toast.success(locale === "ar" ? "تم فتح المكافأة!" : "Reward unlocked!");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Could not unlock");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <div className="py-20 text-saveo-emerald-700/40">Loading...</div>;

  if (!available) {
    return (
      <div className="py-20">
        <Stamp className="mx-auto h-12 w-12 text-saveo-emerald-700/20" />
        <p className="mt-4 text-saveo-emerald-700/50">Collect & Unlock isn't available right now — check back soon!</p>
      </div>
    );
  }

  const pct = target > 0 ? Math.min(100, (progress / target) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🎯 اجمع وافتح" : "🎯 Collect & Unlock"}
      </h1>
      <p className="mt-1 text-sm text-saveo-emerald-700/50">
        {locale === "ar"
          ? (description.ar || `اجمع ${target} أختام وافتح مكافأتك`)
          : (description.en || `Collect ${target} stamps and unlock your reward`)}
      </p>

      <div className="my-10 flex justify-center">
        <AuraGlowCard className="w-fit rounded-2xl">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white p-6 shadow-xl" style={{ maxWidth: 280 }}>
            {Array.from({ length: target }).map((_, i) => (
              <div
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  i < progress ? "bg-saveo-gold-400 text-white" : "bg-saveo-emerald-50 text-saveo-emerald-700/20"
                }`}
              >
                <Stamp className="h-5 w-5" />
              </div>
            ))}
          </div>
        </AuraGlowCard>
      </div>

      <div className="mx-auto mb-6 h-2 max-w-xs overflow-hidden rounded-full bg-saveo-emerald-50">
        <div className="h-full rounded-full bg-saveo-gold-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mb-4 text-sm text-saveo-emerald-700/60">
        {progress} / {target} {locale === "ar" ? "مجموعة" : "collected"}
      </p>

      {unlocked ? (
        <div className="rounded-xl2 bg-saveo-emerald-50 p-5">
          <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-saveo-emerald-700">
            <Sparkles className="h-4 w-4 text-saveo-gold-500" /> {locale === "ar" ? "مبروك، فتحت مكافأتك!" : "Unlocked! Congratulations!"}
          </p>
          {reward && <p className="mt-1 text-lg font-black text-saveo-emerald-800">{reward.label}</p>}
        </div>
      ) : progress >= target ? (
        <button onClick={handleClaim} disabled={claiming} className="btn-primary flex items-center justify-center gap-2 px-8">
          <Unlock className="h-4 w-4" />
          {claiming ? (locale === "ar" ? "جاري الفتح..." : "Unlocking...") : locale === "ar" ? "افتح المكافأة" : "Unlock Reward"}
        </button>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-sm text-saveo-emerald-700/40">
          <Lock className="h-4 w-4" />
          {locale === "ar" ? "استمر بالتسوق لجمع المزيد" : "Keep shopping to collect more"}
        </p>
      )}
    </div>
  );
}
