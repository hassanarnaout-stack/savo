"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Sparkles, Eye } from "lucide-react";
import { AuraGlowCard } from "@/components/ui/aura-glow-card";
import { formatKWD } from "@/lib/utils";

export function HiddenCashbackExperience({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [alreadyRevealed, setAlreadyRevealed] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [description, setDescription] = useState<{ en: string | null; ar: string | null }>({ en: null, ar: null });

  useEffect(() => {
    fetch("/api/campaigns/hidden-cashback/status")
      .then((r) => r.json())
      .then((data) => {
        setAvailable(data.available);
        setAlreadyRevealed(data.alreadyRevealedToday);
        setAmount(data.todaysAmount);
        if (data.campaign) {
          setDescription({ en: data.campaign.customerDescription, ar: data.campaign.customerDescriptionAr });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleReveal() {
    setRevealing(true);
    try {
      const res = await fetch("/api/campaigns/hidden-cashback/reveal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reveal");
      setAmount(data.amount);
      setAlreadyRevealed(true);
      toast.success(locale === "ar" ? "تمت إضافة الرصيد لمحفظتك!" : "Credit added to your wallet!");
    } catch (err: any) {
      toast.error(err.message ?? "Could not reveal");
    } finally {
      setRevealing(false);
    }
  }

  if (loading) return <div className="py-20 text-saveo-emerald-700/40">Loading...</div>;

  if (!available) {
    return (
      <div className="py-20">
        <Wallet className="mx-auto h-12 w-12 text-saveo-emerald-700/20" />
        <p className="mt-4 text-saveo-emerald-700/50">Hidden Cashback isn't available right now — check back soon!</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "💰 استرداد نقدي مخفي" : "💰 Hidden Cashback"}
      </h1>
      <p className="mt-1 text-sm text-saveo-emerald-700/50">
        {locale === "ar"
          ? (description.ar || "اكشف رصيدك المخفي — يُضاف فوراً لمحفظتك")
          : (description.en || "Reveal your hidden cashback — credited to your wallet instantly")}
      </p>

      <div className="my-10 flex justify-center">
        <AuraGlowCard className="w-fit rounded-2xl">
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-saveo-gold-400 to-saveo-gold-600 shadow-xl">
            {alreadyRevealed && amount !== null ? (
              <div className="text-center">
                <Wallet className="mx-auto h-8 w-8 text-saveo-emerald-900" />
                <p className="mt-1 text-xl font-black text-saveo-emerald-900">{formatKWD(amount)}</p>
              </div>
            ) : (
              <Eye className="h-14 w-14 text-saveo-emerald-900/70" />
            )}
          </div>
        </AuraGlowCard>
      </div>

      {alreadyRevealed && amount !== null ? (
        <div className="rounded-xl2 bg-saveo-emerald-50 p-5">
          <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-saveo-emerald-700">
            <Sparkles className="h-4 w-4 text-saveo-gold-500" /> {locale === "ar" ? "أُضيف فعلياً لمحفظتك!" : "Already in your wallet!"}
          </p>
          <p className="mt-4 text-xs text-saveo-emerald-700/40">
            {locale === "ar" ? "رجّع بكرة لمبلغ جديد!" : "Come back tomorrow for another one!"}
          </p>
        </div>
      ) : (
        <button onClick={handleReveal} disabled={revealing} className="btn-primary flex items-center justify-center gap-2 px-8">
          <Eye className="h-4 w-4" />
          {revealing ? (locale === "ar" ? "جاري الكشف..." : "Revealing...") : locale === "ar" ? "اكشف رصيدك" : "Reveal Your Cashback"}
        </button>
      )}
    </div>
  );
}
