"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import { toast } from "sonner";
import { PlusBadge } from "@/components/membership/plus-badge";
import { trackClientEvent } from "@/lib/track-client-event";
import { getAnalyticsSessionId } from "@/lib/analytics-session";
import { CheckoutMysteryBoxChoices } from "@/components/checkout/checkout-mystery-box-choices";

const GOVERNORATES = [
  { value: "Al Asimah", ar: "العاصمة" },
  { value: "Hawalli", ar: "حولي" },
  { value: "Farwaniya", ar: "الفروانية" },
  { value: "Mubarak Al-Kabeer", ar: "مبارك الكبير" },
  { value: "Ahmadi", ar: "الأحمدي" },
  { value: "Jahra", ar: "الجهراء" },
];

export default function CheckoutPage() {
  const { items, subtotal, totalSavings, clear } = useCartStore();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("checkoutPage");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"KNET" | "CARD" | "COD">("KNET");
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftWrapRequested, setGiftWrapRequested] = useState(false);
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [membership, setMembership] = useState({ isMember: false, extraDiscountPercent: 0, hasFreeDelivery: false });
  const [mysteryBoxChoices, setMysteryBoxChoices] = useState<Record<string, string[]>>(() => {
    // Pre-filled from real cart items already locked via the Build/Lock
    // experience — the existing at-checkout picker (below) only ever
    // needs to handle a box that somehow lacks this (backward compat).
    const preset: Record<string, string[]> = {};
    for (const item of items) {
      if (item.mysteryBoxChoiceIds && item.mysteryBoxChoiceIds.length > 0) {
        preset[item.productId] = item.mysteryBoxChoiceIds;
      }
    }
    return preset;
  });
  const [mysteryChoicesComplete, setMysteryChoicesComplete] = useState(true);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    governorate: GOVERNORATES[0].value,
    area: "",
    block: "",
    street: "",
    building: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/membership/status")
      .then((r) => r.json())
      .then(setMembership)
      .catch(() => {});
    trackClientEvent("CHECKOUT_START", { metadata: { itemCount: items.length } });
  }, []);

  // Safety net for Zustand persist's async hydration — items can still
  // be empty on the very first render even though localStorage has
  // real data. Re-syncs any already-locked Mystery Box choices as soon
  // as the real cart items are actually available.
  useEffect(() => {
    setMysteryBoxChoices((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of items) {
        if (item.mysteryBoxChoiceIds && item.mysteryBoxChoiceIds.length > 0 && !next[item.productId]) {
          next[item.productId] = item.mysteryBoxChoiceIds;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const membershipDiscount = (subtotal() * membership.extraDiscountPercent) / 100;
  const deliveryFee = membership.hasFreeDelivery ? 0 : subtotal() >= 15 ? 0 : 1.5;
  const total = subtotal() - membershipDiscount + deliveryFee;

  async function handleCheckGiftCard() {
    if (!giftCardCode.trim()) return;
    setGiftCardError(null);
    try {
      const res = await fetch(`/api/gift-cards/check?code=${encodeURIComponent(giftCardCode.trim())}`);
      const data = await res.json();
      if (!data.valid) {
        setGiftCardBalance(null);
        setGiftCardError(data.reason ?? "Invalid gift card");
        return;
      }
      setGiftCardBalance(data.balance);
    } catch {
      setGiftCardError("Could not check gift card");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    if (!mysteryChoicesComplete) {
      toast.error(locale === "ar" ? "أكمل اختيار محتويات صندوق المفاجآت أولاً" : "Please finish your Mystery Box picks first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          mysteryBoxChoices,
          address: form,
          paymentMethod,
          analyticsSessionId: getAnalyticsSessionId(),
          isGift,
          giftMessage: isGift ? giftMessage || undefined : undefined,
          giftWrapRequested: isGift ? giftWrapRequested : false,
          scheduledDeliveryDate: scheduledDeliveryDate || undefined,
          giftCardCode: giftCardBalance !== null ? giftCardCode : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not place order");
      }
      const data = await res.json();
      clear();
      toast.success(t("orderSuccess"));
      if (data.membershipSavings > 0) {
        toast.success(`You saved ${formatKWD(data.membershipSavings)} with Savo Plus`, { duration: 5000 });
      }
      if (data.goldenTicket?.won) {
        toast.success(`🎫 You won a Golden Ticket! ${data.goldenTicket.reward?.label ?? ""}`, { duration: 6000 });
      }
      router.push(`/account/orders/${data.orderId}`);
    } catch (err: any) {
      toast.error(err.message ?? t("orderError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold">{t("emptyCart")}</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-4 font-bold">{t("deliveryAddress")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t("fullName")} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
              <Input label={t("phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
              <div>
                <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">{t("governorate")}</label>
                <select
                  value={form.governorate}
                  onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                >
                  {GOVERNORATES.map((g) => (
                    <option key={g.value} value={g.value}>{locale === "ar" ? g.ar : g.value}</option>
                  ))}
                </select>
              </div>
              <Input label={t("area")} value={form.area} onChange={(v) => setForm({ ...form, area: v })} required />
              <Input label={t("block")} value={form.block} onChange={(v) => setForm({ ...form, block: v })} />
              <Input label={t("street")} value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
              <Input label={t("building")} value={form.building} onChange={(v) => setForm({ ...form, building: v })} />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">{t("deliveryNotes")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                rows={2}
              />
            </div>
          </section>

          <section className="card p-5">
            <label className="mb-3 flex items-center gap-2 font-bold">
              <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="h-4 w-4" />
              🎁 This is a gift
            </label>
            {isGift && (
              <div className="space-y-3">
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Add a personal gift message (optional)"
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={giftWrapRequested} onChange={(e) => setGiftWrapRequested(e.target.checked)} className="h-4 w-4" />
                  Add gift wrap (+1.000 KD)
                </label>
              </div>
            )}
            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold text-saveo-emerald-700/70">Scheduled delivery date (optional)</label>
              <input
                type="date"
                value={scheduledDeliveryDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold">Gift Card</h2>
            <div className="flex gap-2">
              <input
                value={giftCardCode}
                onChange={(e) => { setGiftCardCode(e.target.value); setGiftCardBalance(null); setGiftCardError(null); }}
                placeholder="SVO-XXXX-XXXX-XXXX"
                className="flex-1 rounded-lg border border-black/10 px-3 py-2.5 text-sm"
              />
              <button type="button" onClick={handleCheckGiftCard} className="btn-outline text-sm">Apply</button>
            </div>
            {giftCardBalance !== null && (
              <p className="mt-2 text-sm font-semibold text-saveo-emerald-700">✓ {formatKWD(giftCardBalance)} available</p>
            )}
            {giftCardError && <p className="mt-2 text-sm font-semibold text-red-600">{giftCardError}</p>}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold">{t("paymentMethod")}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["KNET", "CARD", "COD"] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl2 border p-4 text-sm font-semibold ${
                    paymentMethod === method
                      ? "border-saveo-emerald-700 bg-saveo-emerald-50"
                      : "border-black/10"
                  }`}
                >
                  {method === "KNET" ? t("knet") : method === "CARD" ? t("card") : t("cod")}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="card h-fit p-5">
          <h2 className="mb-4 font-bold">{t("orderSummary")}</h2>
          <ul className="mb-3 max-h-52 space-y-2 overflow-y-auto text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between">
                <span className="line-clamp-1">{i.name} × {i.quantity}</span>
                <span className="font-semibold">{formatKWD(i.saveoPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-black/5 pt-3 text-sm">
            <div className="flex justify-between text-saveo-emerald-700/60">
              <span>{t("savings")}</span>
              <span className="font-semibold text-saveo-emerald-600">{formatKWD(totalSavings())}</span>
            </div>
            {membership.isMember && membershipDiscount > 0 && (
              <div className="flex items-center justify-between text-saveo-emerald-700/60">
                <span className="flex items-center gap-1.5">
                  You saved with <PlusBadge size="xs" />
                </span>
                <span className="font-semibold text-saveo-emerald-600">{formatKWD(membershipDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-saveo-emerald-700/60">
              <span>{t("deliveryLabel")}</span>
              <span>{deliveryFee === 0 ? t("free") : formatKWD(deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-black/5 pt-2 text-base font-bold">
              <span>{t("total")}</span>
              <span>{formatKWD(total)}</span>
            </div>
          </div>
          <CheckoutMysteryBoxChoices
            cartProductIds={items.map((i) => i.productId)}
            locale={locale}
            presetChoices={Object.fromEntries(items.filter((i) => i.mysteryBoxChoiceIds?.length).map((i) => [i.productId, i.mysteryBoxChoiceIds!]))}
            onChoicesChange={(choices, complete) => {
              setMysteryBoxChoices(choices);
              setMysteryChoicesComplete(complete);
            }}
          />
          <button type="submit" disabled={submitting || !mysteryChoicesComplete} className="btn-primary mt-5 w-full">
            {submitting ? t("placingOrder") : t("placeOrder")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
      />
    </div>
  );
}
