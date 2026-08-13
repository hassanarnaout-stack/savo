import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { formatKWD } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/order/order-status-badge";
import { LuxuryEmptyState } from "@/components/ui/luxury-empty-state";

export default async function OrderHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/orders");

  const [orders, t, locale] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { supplierOrders: { include: { items: true } } },
    }),
    getTranslations("account"),
    getLocale(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">{t("orderHistory")}</h1>

      {orders.length === 0 ? (
        <LuxuryEmptyState title={t("noOrders")} ctaLabel={t("startShopping")} ctaHref="/products" />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/account/orders/${order.id}`} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-xs text-saveo-emerald-700/50">
                    {t("itemsCount", { count: order.supplierOrders.reduce((n, so) => n + so.items.length, 0) })} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString(locale === "ar" ? "ar-KW" : "en-GB")}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-bold">{formatKWD(Number(order.total))}</p>
                  <OrderStatusBadge status={order.status} locale={locale} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
