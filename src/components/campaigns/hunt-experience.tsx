"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Sparkles } from "lucide-react";
import { CountdownTimer } from "@/components/product/countdown-timer";

export function HuntExperience({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [reward, setReward] = useState<any>(null);

  useEffect(() => {
    fetch("/api/campaigns/hunt/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/campaigns/hunt/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not claim reward");
      setReward(data.reward);
      toast.success("You found it! 🎉");
    } catch (err: any) {
      toast.error(err.message ?? "Could not claim reward");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <div className="py-20 text-saveo-emerald-700/40">Loading...</div>;

  if (!status?.available) {
    return (
      <div className="py-20">
        <Search className="mx-auto h-12 w-12 text-saveo-emerald-700/20" />
        <p className="mt-4 text-saveo-emerald-700/50">No hunt is live right now — check back soon!</p>
      </div>
    );
  }

  return (
    <div>
      <Search className="mx-auto h-12 w-12 text-saveo-gold-500" />
      <h1 className="mt-3 text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🔍 اعثر على الصفقة المخفية" : "🔍 Find the Hidden Deal"}
      </h1>
      {(status.customerDescription || status.customerDescriptionAr) && (
        <p className="mt-1 text-sm text-saveo-emerald-700/50">
          {locale === "ar" ? (status.customerDescriptionAr || status.customerDescription) : (status.customerDescription || status.customerDescriptionAr)}
        </p>
      )}
      <div className="mt-3 flex justify-center">
        <CountdownTimer dealEndsAt={status.endAt} />
      </div>
      <p className="mt-3 text-sm text-saveo-emerald-700/50">
        {status.spotsLeft} / {status.maxWinners} {locale === "ar" ? "فرص فوز متبقية" : "winning spots left"}
      </p>

      {reward || status.alreadyClaimed ? (
        <div className="mt-6 rounded-xl2 bg-saveo-emerald-50 p-5">
          <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-saveo-emerald-700">
            <Sparkles className="h-4 w-4 text-saveo-gold-500" /> {locale === "ar" ? "مبروك!" : "Congratulations!"}
          </p>
          {reward && <p className="mt-1 text-lg font-black text-saveo-emerald-800">{reward.label}</p>}
        </div>
      ) : (
        <button onClick={handleClaim} disabled={claiming} className="btn-primary mt-6 px-8">
          {claiming ? "..." : locale === "ar" ? "لقيتها!" : "I Found It!"}
        </button>
      )}
    </div>
  );
}
