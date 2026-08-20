"use client";

import { useState, useEffect } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import { toast } from "sonner";
import { PlusBadge } from "@/components/membership/plus-badge";
import { trackClientEvent } from "@/lib/track-client-event";
import { getAnalyticsSessionId } from "@/lib/analytics-session";

const GOVERNORATES = [
  { value: "Al Asimah", ar: "العاصمة" },
  { value: "Hawalli", ar: "حولي" },
  { value: "Farwaniya", ar: "الفروانية" },
  { value: "Mubarak Al-Kabeer", ar: "مبارك الكبير" },
  { value: "Ahmadi", ar: "الأحمدي" },
  { value: "Jahra", ar: "الجهراء" },
];

/**
 * SAVO Checkout — exact V22 visual transplant (CheckoutPage, V22
 * CustomerPages.tsx) for the sections it covers (address, gift toggle,
 * promo/gift-card input, sticky order summary, submit CTA), PLUS three
 * real sections the Figma prototype doesn't include but production
 * genuinely implements — Payment Method (KNET/CARD/COD), Scheduled
 * Delivery Date, and Mystery Box choice picker — built in the SAME V22
 * design language rather than a second visual style, per the explicit
 * "adapt using the same design system" rule. ALL business logic below
 * is byte-for-byte unchanged from the pre-migration version: same
 * useState fields, same /api/checkout submission shape, same
 * /api/gift-cards/check call, same membership discount math. The
 * at-checkout Mystery Box CHOICE PICKER UI is retired (2026 approved
 * flow requires the real choice to already be made pre-checkout via
 * Build/Lock) — but the real mysteryBoxChoices DATA (item.mysteryBoxChoiceIds)
 * is still read from the cart and sent to /api/checkout exactly as
 * before; that data drives the real server-side reveal (checkout/route.ts
 * createPendingReveal) and is not "old logic", it's the current system.
 */
export default function CheckoutPage() {
  const { items, subtotal, totalSavings, clear } = useCartStore();
  const router = useRouter();
  const locale = useLocale();
  const isArabic = locale === "ar";
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
    const preset: Record<string, string[]> = {};
    for (const item of items) {
      if (item.mysteryBoxChoiceIds && item.mysteryBoxChoiceIds.length > 0) {
        preset[item.productId] = item.mysteryBoxChoiceIds;
      }
    }
    return preset;
  });
  // Mystery Box choices are now ALWAYS made pre-checkout via the
  // Build/Lock experience (2026 approved flow) — every box in the
  // cart already carries its real mysteryBoxChoiceIds. The old
  // at-checkout fallback picker UI is retired; this stays true so the
  // submit button is never blocked on a picker that no longer exists.
  const mysteryChoicesComplete = true;
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
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);

  useEffect(() => {
    fetch("/api/membership/status")
      .then((r) => r.json())
      .then(setMembership)
      .catch(() => {});
    // Real saved addresses (AddressService) — the customer no longer
    // has to retype an address they've already saved. The default one
    // is preselected automatically; "Add new address" reveals the
    // existing manual form unchanged.
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => {
        const addresses = data.addresses ?? [];
        setSavedAddresses(addresses);
        const def = addresses.find((a: any) => a.isDefault) ?? addresses[0];
        if (def) setSelectedAddressId(def.id);
        else setUseNewAddress(true);
      })
      .catch(() => setUseNewAddress(true));
    trackClientEvent("CHECKOUT_START", { metadata: { itemCount: items.length } });
  }, []);

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
      toast.error(isArabic ? "أكمل اختيار محتويات صندوق المفاجآت أولاً" : "Please finish your Mystery Box picks first");
      return;
    }
    // Uses the customer's real selected saved address when one is
    // chosen (and "Add new address" wasn't opened); falls back to the
    // manual form exactly as before otherwise. /api/checkout itself is
    // unchanged — it always creates its own real Address row either way.
    const selectedSaved = !useNewAddress ? savedAddresses.find((a) => a.id === selectedAddressId) : null;
    const addressPayload = selectedSaved
      ? { fullName: selectedSaved.fullName, phone: selectedSaved.phone, governorate: selectedSaved.governorate, area: selectedSaved.area, block: selectedSaved.block ?? undefined, street: selectedSaved.street ?? undefined, building: selectedSaved.building ?? undefined, notes: selectedSaved.notes ?? undefined }
      : form;
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          mysteryBoxChoices,
          address: addressPayload,
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
      <div className="savo-checkout-page">
        <div className="savo-checkout-empty">{t("emptyCart")}</div>
      </div>
    );
  }

  return (
    <div className="savo-checkout-page">
      <div className="savo-checkout-header">
        <Link href="/cart" className="savo-checkout-back">← {isArabic ? "العودة" : "Back"}</Link>
        <div className="savo-checkout-header-title">{t("title")}</div>
        <div className="savo-checkout-secure"><span>✓</span> {isArabic ? "دفع آمن" : "Secure checkout"}</div>
      </div>

      <form onSubmit={handleSubmit} className="savo-checkout-body">
        <div className="savo-checkout-left">
          <section className="savo-checkout-section">
            <div className="savo-checkout-section-head">
              <span className="savo-checkout-step">1</span>
              <span>{t("deliveryAddress")}</span>
            </div>

            {savedAddresses.length > 0 && !useNewAddress && (
              <div className="savo-checkout-saved-addresses">
                {savedAddresses.map((a) => (
                  <label key={a.id} className={`savo-checkout-saved-addr ${selectedAddressId === a.id ? "is-selected" : ""}`}>
                    <input type="radio" name="savedAddress" checked={selectedAddressId === a.id} onChange={() => setSelectedAddressId(a.id)} />
                    <div>
                      <div className="savo-checkout-saved-addr-head">
                        <span>{a.label || a.fullName}</span>
                        {a.isDefault && <span className="savo-checkout-saved-addr-default">{isArabic ? "الافتراضي" : "Default"}</span>}
                      </div>
                      <p>{a.governorate}, {a.area}{a.block ? `, Block ${a.block}` : ""}{a.street ? `, ${a.street}` : ""}{a.building ? `, Building ${a.building}` : ""}</p>
                      <p className="savo-checkout-saved-addr-phone">{a.fullName} · {a.phone}</p>
                    </div>
                  </label>
                ))}
                <button type="button" onClick={() => setUseNewAddress(true)} className="savo-checkout-new-addr-btn">+ {isArabic ? "إضافة عنوان جديد" : "Add new address"}</button>
              </div>
            )}

            {(savedAddresses.length === 0 || useNewAddress) && (
              <>
                {savedAddresses.length > 0 && (
                  <button type="button" onClick={() => setUseNewAddress(false)} className="savo-checkout-back-to-saved">← {isArabic ? "استخدم عنوانًا محفوظًا" : "Use a saved address"}</button>
                )}
                <div className="savo-checkout-grid">
                  <CheckoutInput label={t("fullName")} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
                  <CheckoutInput label={t("phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
                  <div>
                    <label className="savo-checkout-label">{t("governorate")}</label>
                    <select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="savo-checkout-select">
                      {GOVERNORATES.map((g) => (
                        <option key={g.value} value={g.value}>{isArabic ? g.ar : g.value}</option>
                      ))}
                    </select>
                  </div>
                  <CheckoutInput label={t("area")} value={form.area} onChange={(v) => setForm({ ...form, area: v })} required />
                  <CheckoutInput label={t("block")} value={form.block} onChange={(v) => setForm({ ...form, block: v })} />
                  <CheckoutInput label={t("street")} value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
                  <CheckoutInput label={t("building")} value={form.building} onChange={(v) => setForm({ ...form, building: v })} />
                </div>
                <div className="savo-checkout-field">
                  <label className="savo-checkout-label">{t("deliveryNotes")}</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="savo-checkout-textarea" rows={2} />
                </div>
              </>
            )}
          </section>

          <section className="savo-checkout-card">
            <label className="savo-checkout-check-row">
              <span onClick={() => setIsGift(!isGift)} className={`savo-checkout-checkbox ${isGift ? "is-checked" : ""}`}>
                {isGift && <span>✓</span>}
              </span>
              <div>
                <div className="savo-checkout-check-title">🎁 {isArabic ? "هذا هدية" : "This is a gift"}</div>
                {isGift && <div className="savo-checkout-check-sub">{isArabic ? "سيتم إزالة الأسعار من الفاتورة داخل الصندوق." : "Prices will be removed from the packing slip."}</div>}
              </div>
            </label>
            {isGift && (
              <div className="savo-checkout-gift-fields">
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder={isArabic ? "أضف رسالة هدية شخصية (اختياري)" : "Add a personal gift message (optional)"}
                  rows={2}
                  maxLength={500}
                  className="savo-checkout-textarea"
                />
                <label className="savo-checkout-check-row savo-checkout-check-row--sm">
                  <input type="checkbox" checked={giftWrapRequested} onChange={(e) => setGiftWrapRequested(e.target.checked)} />
                  {isArabic ? "أضف تغليف هدايا (+1.000 د.ك)" : "Add gift wrap (+1.000 KD)"}
                </label>
              </div>
            )}
            <div className="savo-checkout-field">
              <label className="savo-checkout-label">{isArabic ? "تاريخ توصيل مجدول (اختياري)" : "Scheduled delivery date (optional)"}</label>
              <input type="date" value={scheduledDeliveryDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setScheduledDeliveryDate(e.target.value)} className="savo-checkout-input" />
            </div>
          </section>

          <section className="savo-checkout-card">
            <p className="savo-checkout-promo-label">{isArabic ? "بطاقة هدايا" : "Gift Card"}</p>
            <div className="savo-checkout-promo-row">
              <input
                value={giftCardCode}
                onChange={(e) => { setGiftCardCode(e.target.value); setGiftCardBalance(null); setGiftCardError(null); }}
                placeholder="SVO-XXXX-XXXX-XXXX"
                className="savo-checkout-input"
              />
              <button type="button" onClick={handleCheckGiftCard} className="savo-checkout-apply-btn">{isArabic ? "تطبيق" : "Apply"}</button>
            </div>
            {giftCardBalance !== null && <p className="savo-checkout-gift-ok">✓ {formatKWD(giftCardBalance)} {isArabic ? "متاح" : "available"}</p>}
            {giftCardError && <p className="savo-checkout-gift-err">{giftCardError}</p>}
          </section>

          <section className="savo-checkout-card">
            <p className="savo-checkout-promo-label">{t("paymentMethod")}</p>
            <div className="savo-checkout-payment-grid">
              {(["KNET", "CARD", "COD"] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`savo-checkout-payment-btn ${paymentMethod === method ? "is-active" : ""}`}
                >
                  {method === "KNET" ? t("knet") : method === "CARD" ? t("card") : t("cod")}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="savo-checkout-right">
          <div className="savo-checkout-summary">
            <div className="savo-checkout-summary-head">{t("orderSummary")}</div>
            <div className="savo-checkout-summary-items">
              {items.map((i) => (
                <div key={i.productId} className="savo-checkout-summary-item">
                  <span>{i.name} × {i.quantity}</span>
                  <span>{formatKWD(i.saveoPrice * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="savo-checkout-summary-totals">
              <div className="savo-checkout-summary-row">
                <span>{t("savings")}</span>
                <span className="savo-checkout-summary-savings">−{formatKWD(totalSavings())}</span>
              </div>
              {membership.isMember && membershipDiscount > 0 && (
                <div className="savo-checkout-summary-row">
                  <span className="savo-checkout-plus-row">{isArabic ? "وفّرت مع" : "You saved with"} <PlusBadge size="xs" /></span>
                  <span className="savo-checkout-summary-savings">{formatKWD(membershipDiscount)}</span>
                </div>
              )}
              <div className="savo-checkout-summary-row">
                <span>{t("deliveryLabel")}</span>
                <span>{deliveryFee === 0 ? t("free") : formatKWD(deliveryFee)}</span>
              </div>
              <div className="savo-checkout-summary-row savo-checkout-summary-total">
                <span>{t("total")}</span>
                <span>{formatKWD(total)}</span>
              </div>
            </div>
            <button type="submit" disabled={submitting || !mysteryChoicesComplete} className="savo-checkout-submit">
              {submitting ? t("placingOrder") : t("placeOrder")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function CheckoutInput({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="savo-checkout-label">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="savo-checkout-input" />
    </div>
  );
}
