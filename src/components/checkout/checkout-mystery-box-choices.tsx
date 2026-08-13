"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Gift } from "lucide-react";

interface BoxOption {
  id: string; name: string; nameAr: string | null; saveoPrice: string;
  images: { url: string }[];
}
interface BoxChoice {
  productId: string; name: string; nameAr: string | null; chooseCount: number; options: BoxOption[];
}

export function CheckoutMysteryBoxChoices({
  cartProductIds,
  locale,
  onChoicesChange,
}: {
  cartProductIds: string[];
  locale: string;
  onChoicesChange: (choices: Record<string, string[]>, allComplete: boolean) => void;
}) {
  const [boxes, setBoxes] = useState<BoxChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (cartProductIds.length === 0) {
      setLoading(false);
      return;
    }
    fetch("/api/checkout/mystery-box-choices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: cartProductIds }),
    })
      .then((r) => r.json())
      .then((data) => setBoxes(data.boxes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartProductIds.join(",")]);

  useEffect(() => {
    const allComplete = boxes.every((b) => (selections[b.productId]?.length ?? 0) === b.chooseCount);
    onChoicesChange(selections, boxes.length === 0 || allComplete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, boxes]);

  function toggle(box: BoxChoice, productId: string) {
    setSelections((prev) => {
      const current = prev[box.productId] ?? [];
      if (current.includes(productId)) {
        return { ...prev, [box.productId]: current.filter((id) => id !== productId) };
      }
      if (current.length >= box.chooseCount) return prev;
      return { ...prev, [box.productId]: [...current, productId] };
    });
  }

  if (loading || boxes.length === 0) return null;

  return (
    <div className="space-y-4">
      {boxes.map((box) => {
        const boxName = locale === "ar" && box.nameAr ? box.nameAr : box.name;
        const selected = selections[box.productId] ?? [];
        return (
          <div key={box.productId} className="card shadow-luxury p-5">
            <div className="mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-saveo-gold-500" />
              <p className="font-bold text-saveo-emerald-800">{boxName}</p>
            </div>
            <p className="mb-3 text-sm text-saveo-emerald-700/60">
              {locale === "ar"
                ? `اختر ${box.chooseCount} من الخيارات التالية لصندوقك — الباقي مفاجأة عند الاستلام!`
                : `Pick ${box.chooseCount} of the options below for your box — the rest is a surprise at delivery!`}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {box.options.map((opt) => {
                const optName = locale === "ar" && opt.nameAr ? opt.nameAr : opt.name;
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(box, opt.id)}
                    className={`flex items-center gap-2.5 rounded-xl2 border p-2.5 text-start transition-all ${isSelected ? "border-saveo-gold-400 bg-saveo-gold-50" : "border-black/5"}`}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/5">
                      {opt.images[0] && <Image src={opt.images[0].url} alt={optName} fill className="object-cover" />}
                    </div>
                    <p className="flex-1 text-xs font-semibold text-saveo-emerald-800">{optName}</p>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-saveo-gold-600" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-saveo-emerald-700/40">
              {selected.length} / {box.chooseCount} {locale === "ar" ? "مختارة" : "selected"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
