import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { formatKWD } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { SupplierOrderStatusBadge } from "@/components/order/supplier-order-status-badge";
import { PlusBadge } from "@/components/membership/plus-badge";
import { ReportIssueForm } from "@/components/order/report-issue-form";
import { ReturnRequestForm } from "@/components/order/return-request-form";
import { LiveTrackingClient } from "@/components/order/live-tracking-client";

interface Props {
  params: Promise<{ id: string }>;
}

const SUPPLIER_STEPS = ["PENDING", "ACCEPTED", "PREPARING", "SHIPPED", "DELIVERED"];

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            {order.isMembershipOrder && <PlusBadge size="sm" />}
          </div>
          <p className="text-xs text-saveo-emerald-700/50">
            {t("placed")} {new Date(order.createdAt).toLocaleDateString(locale === "ar" ? "ar-KW" : "en-GB")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} locale={locale} />
      </div>

      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-saveo-emerald-700">🚚 Live Tracking</h2>
          <LiveTrackingClient orderId={order.id} />
        </section>
      )}

      {order.supplierOrders.length > 1 && (
        <p className="mb-4 text-sm text-saveo-emerald-700/60">
          {t("multiSupplierNote", { count: order.supplierOrders.length })}
        </p>
      )}

      {/* One card per package, each with its own delivery progress — the
          customer sees a unified Saveo order, never which supplier
          fulfilled which part. */}
      <div className="space-y-4">
        {order.supplierOrders.map((so, index) => {
          const stepIndex = SUPPLIER_STEPS.indexOf(so.status);
          const packageLabel =
            order.supplierOrders.length > 1
              ? locale === "ar"
                ? `الطرد ${index + 1}`
                : `Package ${index + 1}`
              : locale === "ar"
              ? "طلبك"
              : "Your Order";
          return (
            <div key={so.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">{packageLabel}</h2>
                <SupplierOrderStatusBadge status={so.status} locale={locale} />
              </div>

              {so.status !== "CANCELLED" && (
                <div className="mb-4 flex items-center">
                  {SUPPLIER_STEPS.map((step, idx) => (
                    <div key={step} className="flex flex-1 items-center">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          idx <= stepIndex ? "bg-saveo-emerald-700 text-white" : "bg-black/10 text-black/40"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      {idx < SUPPLIER_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 ${idx < stepIndex ? "bg-saveo-emerald-700" : "bg-black/10"}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <ul className="divide-y divide-black/5">
                {so.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{item.productName} × {item.quantity}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatKWD(Number(item.lineTotal))}</span>
                      {item.product.type === "MYSTERY_BOX" && item.mysteryBoxReveal && (
                        <Link
                          href={`/mystery-boxes/reveal/${item.mysteryBoxReveal.id}`}
                          className="rounded-full bg-saveo-gold-400 px-3 py-1 text-xs font-bold text-saveo-emerald-900 hover:bg-saveo-gold-300"
                        >
                          🎁 {item.mysteryBoxReveal.revealedAt ? "View Reveal" : "Open Your Box"}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="card mt-4 p-5">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-saveo-emerald-700/60">
            <span>{t("savings")}</span>
            <span className="text-saveo-emerald-600">{formatKWD(Number(order.discountTotal))}</span>
          </div>
          <div className="flex justify-between text-saveo-emerald-700/60">
            <span>{t("delivery")}</span>
            <span>{Number(order.deliveryFee) === 0 ? t("free") : formatKWD(Number(order.deliveryFee))}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>{t("total")}</span>
            <span>{formatKWD(Number(order.total))}</span>
          </div>
        </div>
      </div>

      {order.address && (
        <div className="card mt-4 p-5 text-sm">
          <h2 className="mb-2 font-bold">{t("deliveryAddress")}</h2>
          <p>{order.address.fullName} · {order.address.phone}</p>
          <p className="text-saveo-emerald-700/60">
            {order.address.governorate}, {order.address.area}
            {order.address.block ? `, Block ${order.address.block}` : ""}
          </p>
        </div>
      )}

      <div className="card mt-4 p-5">
        <h2 className="mb-3 font-bold">Need help with this order?</h2>
        {order.issues.length > 0 && (
          <ul className="mb-4 space-y-2">
            {order.issues.map((issue) => (
              <li key={issue.id} className="rounded-lg bg-black/[0.03] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{issue.subject}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      issue.status === "OPEN"
                        ? "bg-red-100 text-red-700"
                        : issue.status === "PROCESSING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-saveo-emerald-100 text-saveo-emerald-800"
                    }`}
                  >
                    {issue.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-saveo-emerald-700/60">{issue.description}</p>
              </li>
            ))}
          </ul>
        )}
        <ReportIssueForm orderId={order.id} />
        <div className="mt-4 border-t border-black/5 pt-4">
          <ReturnRequestForm orderId={order.id} />
        </div>
      </div>
    </div>
  );
}
