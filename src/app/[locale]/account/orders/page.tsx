import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { formatKWD } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { LuxuryEmptyState } from "@/components/ui/luxury-empty-state";

/**
 * SAVO Order History — exact V22 visual transplant (AccountPage
 * section === 'orders', V22 CustomerPages.tsx). Real business logic
 * 100% unchanged: same prisma.order.findMany query (userId-scoped),
 * same auth redirect, same OrderStatusBadge/LuxuryEmptyState reuse.
 * Query widened to also fetch the first item's product image (V22
 * shows a thumbnail per row) — real product data, zero fake image.
 */
export default async function OrderHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/orders");

  const [orders, t, locale] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { supplierOrders: { include: { items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } } } } },
    }),
    getTranslations("account"),
    getLocale(),
  ]);

  const isArabic = locale === "ar";

  return (
    <div className="savo-orders-page">
      <h1 className="savo-orders-title">{t("orderHistory")}</h1>

      {orders.length === 0 ? (
        <LuxuryEmptyState title={t("noOrders")} ctaLabel={t("startShopping")} ctaHref="/products" />
      ) : (
        <div className="savo-orders-list">
          {orders.map((order) => {
            const firstImage = order.supplierOrders[0]?.items[0]?.product?.images[0]?.url;
            const itemCount = order.supplierOrders.reduce((n, so) => n + so.items.length, 0);
            return (
              <Link key={order.id} href={`/account/orders/${order.id}`} className="savo-order-row">
                <div className="savo-order-row-img">
                  {firstImage && <img src={firstImage} alt="" />}
                </div>
                <div className="savo-order-row-body">
                  <span className="savo-order-row-number">{order.orderNumber}</span>
                  <span className="savo-order-row-meta">{new Date(order.createdAt).toLocaleDateString(isArabic ? "ar-KW" : "en-GB")} · {t("itemsCount", { count: itemCount })}</span>
                </div>
                <div className="savo-order-row-right">
                  <OrderStatusBadge status={order.status} locale={locale} />
                  <span className="savo-order-row-total">{formatKWD(Number(order.total))}</span>
                  <span className="savo-order-row-details">{isArabic ? "التفاصيل" : "Details"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
