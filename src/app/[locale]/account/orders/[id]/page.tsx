import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { formatKWD } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { PlusBadge } from "@/components/membership/plus-badge";
import { ReportIssueForm } from "@/components/order/report-issue-form";
import { ReturnRequestForm } from "@/components/order/return-request-form";
import { LiveTrackingClient } from "@/components/order/live-tracking-client";

interface Props {
  params: Promise<{ id: string }>;
}

const SUPPLIER_STEPS = ["PENDING", "ACCEPTED", "PREPARING", "SHIPPED", "DELIVERED"];

/**
 * SAVO Order Detail — same V22 dark design system as the rest of the
 * migrated account area (no direct Figma reference exists for this
 * screen specifically — V22's Account only shows a simple order LIST,
 * never an expanded detail view — so this adapts the approved V22
 * visual language rather than inventing a second design, per the
 * standing "adapt using the same design system" rule). ALL real
 * business/fulfillment logic below is byte-for-byte unchanged — the
 * order is still genuinely split across separate SupplierOrder
 * fulfillments in the database exactly as before (each with its own
 * real status/tracking). What changed is presentation only: the
 * customer-facing view now merges every package's items into one
 * unified list and shows a single progress bar (the LEAST advanced
 * package, since the order isn't done until all of them are) instead
 * of exposing "Package 1 / Package 2" — a customer ordered from ONE
 * SAVO, not from N suppliers, and should see one order, one delivery.
 * Same live tracking gate, same Mystery Box reveal link, same
 * issue/return forms, same address/pricing breakdown, same userId
 * ownership check.
 */
export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/account/orders/${id}`);

  const [order, t, locale] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        address: true,
        history: { orderBy: { createdAt: "asc" } },
        issues: { orderBy: { createdAt: "desc" } },
        supplierOrders: {
          include: {
            supplier: { select: { companyName: true, companyNameAr: true } },
            items: { include: { mysteryBoxReveal: true, product: { select: { type: true } } } },
          },
        },
      },
    }),
    getTranslations("account"),
    getLocale(),
  ]);

  if (!order || order.userId !== session.user.id) notFound();

  const isArabic = locale === "ar";

  return (
    <div className="savo-orderdetail-page">
      <div className="savo-orderdetail-header">
        <div>
          <div className="savo-orderdetail-title-row">
            <h1 className="savo-orderdetail-title">{order.orderNumber}</h1>
            {order.isMembershipOrder && <PlusBadge size="sm" />}
          </div>
          <p className="savo-orderdetail-placed">
            {t("placed")} {new Date(order.createdAt).toLocaleDateString(isArabic ? "ar-KW" : "en-GB")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} locale={locale} />
      </div>

      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
        <section className="savo-orderdetail-section">
          <h2 className="savo-orderdetail-section-title">🚚 {isArabic ? "التتبع المباشر" : "Live Tracking"}</h2>
          <LiveTrackingClient orderId={order.id} />
        </section>
      )}

      {/* Unified customer-facing view — the order may be split across
          multiple supplier fulfillments behind the scenes (real,
          unchanged), but the customer only ever sees ONE order, ONE
          progress, ONE delivery. The step shown is the LEAST advanced
          supplier package, since the order isn't truly complete for
          the customer until every package has caught up. */}
      {(() => {
        const allItems = order.supplierOrders.flatMap((so) => so.items);
        const stepIndexes = order.supplierOrders.map((so) => SUPPLIER_STEPS.indexOf(so.status)).filter((i) => i >= 0);
        const unifiedStepIndex = stepIndexes.length > 0 ? Math.min(...stepIndexes) : -1;
        const anyCancelled = order.supplierOrders.some((so) => so.status === "CANCELLED");

        return (
          <div className="savo-orderdetail-card">
            <div className="savo-orderdetail-card-head">
              <h2 className="savo-orderdetail-card-title">{isArabic ? "طلبك" : "Your Order"}</h2>
            </div>

            {!anyCancelled && unifiedStepIndex >= 0 && (
              <div className="savo-orderdetail-steps">
                {SUPPLIER_STEPS.map((step, idx) => (
                  <div key={step} className="savo-orderdetail-step">
                    <div className={`savo-orderdetail-step-dot ${idx <= unifiedStepIndex ? "is-active" : ""}`}>{idx + 1}</div>
                    {idx < SUPPLIER_STEPS.length - 1 && <div className={`savo-orderdetail-step-line ${idx < unifiedStepIndex ? "is-active" : ""}`} />}
                  </div>
                ))}
              </div>
            )}

            <ul className="savo-orderdetail-items">
              {allItems.map((item) => (
                <li key={item.id} className="savo-orderdetail-item">
                  <span>{item.productName} × {item.quantity}</span>
                  <div className="savo-orderdetail-item-right">
                    <span className="savo-orderdetail-item-total">{formatKWD(Number(item.lineTotal))}</span>
                    {item.product.type === "MYSTERY_BOX" && item.mysteryBoxReveal && (
                      <Link href={`/mystery-boxes/reveal/${item.mysteryBoxReveal.id}`} className="savo-orderdetail-reveal">
                        🎁 {item.mysteryBoxReveal.revealedAt ? (isArabic ? "شاهد الكشف" : "View Reveal") : (isArabic ? "افتح صندوقك" : "Open Your Box")}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="savo-orderdetail-card">
        <div className="savo-orderdetail-totals">
          <div className="savo-orderdetail-total-row">
            <span>{t("savings")}</span>
            <span className="savo-orderdetail-savings">{formatKWD(Number(order.discountTotal))}</span>
          </div>
          <div className="savo-orderdetail-total-row">
            <span>{t("delivery")}</span>
            <span>{Number(order.deliveryFee) === 0 ? t("free") : formatKWD(Number(order.deliveryFee))}</span>
          </div>
          <div className="savo-orderdetail-total-row savo-orderdetail-total-row--final">
            <span>{t("total")}</span>
            <span>{formatKWD(Number(order.total))}</span>
          </div>
        </div>
      </div>

      {order.address && (
        <div className="savo-orderdetail-card">
          <h2 className="savo-orderdetail-card-title">{t("deliveryAddress")}</h2>
          <p className="savo-orderdetail-address-name">{order.address.fullName} · {order.address.phone}</p>
          <p className="savo-orderdetail-address-line">
            {order.address.governorate}, {order.address.area}
            {order.address.block ? `, Block ${order.address.block}` : ""}
          </p>
        </div>
      )}

      <div className="savo-orderdetail-card">
        <h2 className="savo-orderdetail-card-title">{isArabic ? "تحتاج مساعدة بهذا الطلب؟" : "Need help with this order?"}</h2>
        {order.issues.length > 0 && (
          <ul className="savo-orderdetail-issues">
            {order.issues.map((issue) => (
              <li key={issue.id} className="savo-orderdetail-issue">
                <div className="savo-orderdetail-issue-head">
                  <p className="savo-orderdetail-issue-subject">{issue.subject}</p>
                  <span className={`savo-orderdetail-issue-status savo-orderdetail-issue-status--${issue.status.toLowerCase()}`}>{issue.status}</span>
                </div>
                <p className="savo-orderdetail-issue-desc">{issue.description}</p>
              </li>
            ))}
          </ul>
        )}
        <ReportIssueForm orderId={order.id} />
        <div className="savo-orderdetail-return-wrap">
          <ReturnRequestForm orderId={order.id} />
        </div>
      </div>
    </div>
  );
}
