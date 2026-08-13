const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-saveo-emerald-100 text-saveo-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

const LABELS: Record<string, { en: string; ar: string }> = {
  PENDING: { en: "Pending", ar: "قيد الانتظار" },
  CONFIRMED: { en: "Confirmed", ar: "مؤكد" },
  PREPARING: { en: "Preparing", ar: "قيد التجهيز" },
  DELIVERED: { en: "Delivered", ar: "تم التوصيل" },
  CANCELLED: { en: "Cancelled", ar: "ملغى" },
};

/**
 * Not a "use client" hook-based component on purpose: it's rendered both
 * inside the localized customer app (wrapped in NextIntlClientProvider)
 * and inside the English-only admin dashboard (which has no i18n context
 * at all). Taking `locale` as a plain prop keeps it safe in both places.
 */
export function OrderStatusBadge({ status, locale = "en" }: { status: string; locale?: string }) {
  const label = locale === "ar" ? LABELS[status]?.ar ?? status : LABELS[status]?.en ?? status;

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[status] ?? "bg-black/5"}`}>
      {label}
    </span>
  );
}
