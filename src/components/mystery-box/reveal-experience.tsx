"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { AuraGlowCard } from "@/components/ui/aura-glow-card";
import { formatKWD } from "@/lib/utils";
import { Gift, Sparkles, PartyPopper, Check } from "lucide-react";
import { toast } from "sonner";

interface RevealedItem {
  id: string;
  quantity: number;
  name: string;
  nameAr: string | null;
  slug: string;
  image: string | null;
  saveoPrice: number | string;
  isYourPick?: boolean;
}

interface ChoiceOption {
  id: string;
  possibleProduct: {
    id: string; name: string; nameAr: string | null; saveoPrice: string;
    images: { url: string }[];
  };
}

export function RevealExperience({
  revealId,
  boxName,
  boxNameAr,
  boxImage,
  quantity,
  fallbackDescription,
  fallbackDescriptionAr,
  alreadyRevealed,
  items,
}: {
  revealId: string;
  boxName: string;
  boxNameAr: string | null;
  boxImage: string | null;
  quantity: number;
  fallbackDescription: string | null;
  fallbackDescriptionAr: string | null;
  alreadyRevealed: boolean;
  items: RevealedItem[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState(alreadyRevealed);

  const [loadingChoices, setLoadingChoices] = useState(!alreadyRevealed);
  const [chooseCount, setChooseCount] = useState(0);
  const [choiceOptions, setChoiceOptions] = useState<ChoiceOption[]>([]);
  const [alreadyChosen, setAlreadyChosen] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [submittingChoices, setSubmittingChoices] = useState(false);

  const name = locale === "ar" && boxNameAr ? boxNameAr : boxName;
  const description = locale === "ar" && fallbackDescriptionAr ? fallbackDescriptionAr : fallbackDescription;

  useEffect(() => {
    if (alreadyRevealed) return;
    fetch(`/api/mystery-box/reveal/${revealId}/choices`)
      .then((r) => r.json())
      .then((data) => {
        setChooseCount(data.chooseCount ?? 0);
        setChoiceOptions(data.options ?? []);
        setAlreadyChosen(data.alreadyChosen ?? null);
      })
      .catch(() => {
        toast.error("Could not load your box's choices — please refresh the page.");
      })
      .finally(() => setLoadingChoices(false));
  }, [revealId, alreadyRevealed]);

  function toggleSelect(productId: string) {
    setSelected((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= chooseCount) return prev; // real cap — can't select more than allowed
      return [...prev, productId];
    });
  }

  async function handleSubmitChoices() {
    setSubmittingChoices(true);
    try {
      const res = await fetch(`/api/mystery-box/reveal/${revealId}/choices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save your picks");
      setAlreadyChosen(selected);
      toast.success(locale === "ar" ? "تم حفظ اختياراتك!" : "Your picks are locked in!");
    } catch (err: any) {
      toast.error(err.message ?? "Could not save your picks");
    } finally {
      setSubmittingChoices(false);
    }
  }

  async function handleOpen() {
    setOpening(true);
    try {
      const res = await fetch(`/api/mystery-box/reveal/${revealId}`, { method: "POST" });
      if (!res.ok) throw new Error();
      setTimeout(() => {
        setRevealed(true);
        router.refresh();
      }, 900);
    } catch {
      toast.error("Could not open your box — please try again.");
      setOpening(false);
    }
  }

  // Real choice step — only shown when this box actually has a CHOICE pool
  // configured (chooseCount > 0) and the customer hasn't picked yet.
  if (!revealed && loadingChoices) {
    return <div className="py-20 text-saveo-emerald-700/40">Loading...</div>;
  }

  if (!revealed && chooseCount > 0 && !alreadyChosen) {
    return (
      <div>
        <Gift className="mx-auto h-12 w-12 text-saveo-gold-500" />
        <h1 className="mt-4 text-2xl font-black text-saveo-emerald-700">{name}</h1>
        <p className="mt-2 text-saveo-emerald-700/60">
          {locale === "ar"
            ? `اختر ${chooseCount} من الخيارات التالية — الباقي مفاجأة!`
            : `Pick ${chooseCount} of the options below — the rest stays a surprise!`}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {choiceOptions.map((opt) => {
            const optName = locale === "ar" && opt.possibleProduct.nameAr ? opt.possibleProduct.nameAr : opt.possibleProduct.name;
            const isSelected = selected.includes(opt.possibleProduct.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleSelect(opt.possibleProduct.id)}
                className={`card flex items-center gap-3 p-3 text-start transition-all ${isSelected ? "shadow-luxury ring-2 ring-saveo-gold-400" : ""}`}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl2 bg-black/5">
                  {opt.possibleProduct.images[0] && (
                    <Image src={opt.possibleProduct.images[0].url} alt={optName} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-saveo-emerald-800">{optName}</p>
                  <p className="text-xs text-saveo-emerald-700/50">{formatKWD(Number(opt.possibleProduct.saveoPrice))} value</p>
                </div>
                {isSelected && <Check className="h-5 w-5 shrink-0 text-saveo-gold-500" />}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-saveo-emerald-700/40">
          {selected.length} / {chooseCount} {locale === "ar" ? "مختارة" : "selected"}
        </p>

        <button
          onClick={handleSubmitChoices}
          disabled={selected.length !== chooseCount || submittingChoices}
          className="btn-primary mx-auto mt-6"
        >
          {submittingChoices
            ? locale === "ar" ? "جاري الحفظ..." : "Saving..."
            : locale === "ar" ? "تأكيد الاختيار" : "Confirm My Picks"}
        </button>
      </div>
    );
  }

  if (!revealed) {
    const confirmedPicks = alreadyChosen
      ? choiceOptions.filter((opt) => alreadyChosen.includes(opt.possibleProduct.id))
      : [];

    return (
      <div>
        <AuraGlowCard className="mx-auto w-fit rounded-full">
          <div
            className={`mx-auto flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-saveo-gold-300 to-saveo-gold-500 shadow-xl ${
              opening ? "animate-bounce" : ""
            }`}
          >
            <Gift className="h-24 w-24 text-white" />
          </div>
        </AuraGlowCard>
        <h1 className="mt-8 text-2xl font-black text-saveo-emerald-700">{name}</h1>
        <p className="mt-2 text-saveo-emerald-700/60">
          {locale === "ar" ? "صندوقك جاهز — لحظة الاكتشاف وصلت!" : "Your box is ready — the moment of discovery has arrived!"}
        </p>

        {confirmedPicks.length > 0 && (
          <div className="mx-auto mt-5 max-w-sm rounded-xl2 bg-saveo-emerald-50 p-4 text-start">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-saveo-emerald-700">
              <Check className="h-3.5 w-3.5" /> {locale === "ar" ? "اختياراتك المؤكدة:" : "Your confirmed picks:"}
            </p>
            {confirmedPicks.map((opt) => {
              const optName = locale === "ar" && opt.possibleProduct.nameAr ? opt.possibleProduct.nameAr : opt.possibleProduct.name;
              return (
                <p key={opt.id} className="text-sm text-saveo-emerald-800">
                  • {optName}
                </p>
              );
            })}
            <p className="mt-2 text-xs text-saveo-emerald-700/50">
              {locale === "ar" ? "+ مفاجآت إضافية مخفية بانتظارك بالصندوق!" : "+ more hidden surprises waiting in the box!"}
            </p>
          </div>
        )}

        <button onClick={handleOpen} disabled={opening} className="btn-primary mx-auto mt-8">
          <Sparkles className="h-4 w-4" />
          {opening
            ? locale === "ar" ? "جاري الفتح..." : "Opening..."
            : locale === "ar" ? "افتح الصندوق" : "Open the Box"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PartyPopper className="mx-auto h-12 w-12 text-saveo-gold-500" />
      <h1 className="mt-4 text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "تهانينا! 🎉" : "Congratulations! 🎉"}
      </h1>
      <p className="mt-2 text-saveo-emerald-700/60">
        {locale === "ar" ? `إليك ما حصلت عليه من ${name}` : `Here's what you got in your ${name}`}
      </p>

      {items.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const itemName = locale === "ar" && item.nameAr ? item.nameAr : item.name;

            if (!item.isYourPick) {
              // Real mystery — no name, no image, no price, and deliberately
              // not a link, so the customer can't click through to the real
              // product page and discover the identity that way either.
              return (
                <div key={item.id} className="card flex items-center gap-4 p-4 text-start">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl2 bg-saveo-gold-50">
                    <Gift className="h-7 w-7 text-saveo-gold-500" />
                  </div>
                  <div className="flex-1">
                    <span className="mb-1 inline-block rounded-full bg-saveo-gold-100 px-2 py-0.5 text-[10px] font-bold text-saveo-gold-700">
                      {locale === "ar" ? "✨ مفاجأة!" : "✨ Surprise!"}
                    </span>
                    <p className="font-bold text-saveo-emerald-800">
                      {locale === "ar" ? "منتج مفاجأة مخفي" : "Hidden Surprise Item"}
                      {item.quantity > 1 && ` × ${item.quantity}`}
                    </p>
                    <p className="text-sm text-saveo-emerald-700/50">
                      {locale === "ar" ? "استمتع باكتشافه عند الاستلام!" : "Enjoy discovering it when it arrives!"}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={`/products/${item.slug}`}
                className="card flex items-center gap-4 p-4 text-start transition-transform hover:-translate-y-1"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl2 bg-black/5">
                  {item.image && <Image src={item.image} alt={itemName} fill className="object-cover" />}
                </div>
                <div className="flex-1">
                  <span className="mb-1 inline-block rounded-full bg-saveo-emerald-100 px-2 py-0.5 text-[10px] font-bold text-saveo-emerald-700">
                    {locale === "ar" ? "🎯 اختيارك" : "🎯 Your Pick"}
                  </span>
                  <p className="font-bold text-saveo-emerald-800">
                    {itemName} {item.quantity > 1 && `× ${item.quantity}`}
                  </p>
                  <p className="text-sm text-saveo-emerald-700/50">{formatKWD(Number(item.saveoPrice))} value</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card mt-8 p-6 text-start">
          <p className="text-sm text-saveo-emerald-700/70">
            {description ?? (locale === "ar" ? "استمتع بمفاجأتك!" : "Enjoy your surprise!")}
          </p>
          <p className="mt-3 text-xs text-saveo-emerald-700/40">
            {locale === "ar"
              ? "تفاصيل المحتوى الدقيقة لهذا الصندوق لم تُضبط بعد — بس مورّدك جهّز مفاجأتك بعناية."
              : "Exact item-level details for this box aren't configured yet — but your supplier has hand-picked your surprise."}
          </p>
        </div>
      )}

      <Link href="/account/orders" className="btn-outline mx-auto mt-8">
        {locale === "ar" ? "طلباتي" : "My Orders"}
      </Link>
    </div>
  );
}
