const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-saveo-gold-100 text-saveo-gold-700",
  DELIVERED: "bg-saveo-emerald-100 text-saveo-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

const LABELS: Record<string, { en: string; ar: string }> = {
  PENDING: { en: "Pending", ar: "قيد الانتظار" },
  ACCEPTED: { en: "Accepted", ar: "تم القبول" },
  PREPARING: { en: "Preparing", ar: "قيد التجهيز" },
  SHIPPED: { en: "Shipped", ar: "تم الشحن" },
  DELIVERED: { en: "Delivered", ar: "تم التوصيل" },
  CANCELLED: { en: "Cancelled", ar: "ملغى" },
};

/** See order-status-badge.tsx for why this takes `locale` as a plain prop
 * instead of reading it from next-intl's client context. */
export function SupplierOrderStatusBadge({ status, locale = "en" }: { status: string; locale?: string }) {
  const label = locale === "ar" ? LABELS[status]?.ar ?? status : LABELS[status]?.en ?? status;

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[status] ?? "bg-black/5"}`}>
      {label}
    </span>
  );
}
