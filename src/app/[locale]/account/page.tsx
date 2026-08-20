import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { Package, Heart, MapPin, Wallet, Repeat } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AccountPlusSummary } from "@/components/membership/account-plus-summary";
import { CustomerBehaviorEngine } from "@/lib/services/customer-behavior-engine";
import { ProductRail } from "@/components/product/product-grid";
import { serializeProducts, formatKWD } from "@/lib/utils";
import { getLaunchFlags } from "@/lib/launch-flags";
import { OrderStatusBadge } from "@/components/order/order-status-badge";

export const dynamic = "force-dynamic";

/**
 * SAVO Account — exact V22 visual transplant (AccountPage overview
 * section, V22 CustomerPages.tsx: sidebar nav + dark main content).
 * ALL business logic below is byte-for-byte unchanged from the
 * pre-migration version: same order/favorite counts, same
 * AccountPlusSummary (real Plus pricing/state — reuses the exact same
 * .savo-plus-card component/data source as the canonical /membership
 * page: MembershipService.getUserMembership/isActiveMember/getSavings
 * + BenefitEngine.listActiveBenefits, real MembershipPlanBenefit —
 * CustomerBehaviorEngine.getNextBestProducts recommendation source,
 * same feature-flag gate (SAVEO_PLUS_ENABLED), same next-auth
 * signOut. "Recent orders" reuses the exact real query pattern from
 * /account/orders (supplierOrders.items), take:2, zero fake data.
 */
export default async function AccountPage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const [orderCount, favoriteCount, t, locale, nextBestProducts, common, pT, recentOrders] = await Promise.all([
    prisma.order.count({ where: { userId: session.user.id } }),
    prisma.favorite.count({ where: { userId: session.user.id } }),
    getTranslations("account"),
    getLocale(),
    CustomerBehaviorEngine.getNextBestProducts(session.user.id, 6),
    getTranslations("common"),
    getTranslations("product"),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 2,
      include: { supplierOrders: { include: { items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } } } } },
    }),
  ]);

  const recommendedProducts = nextBestProducts.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: nextBestProducts.map((r) => r.productId) }, status: "ACTIVE" },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      })
    : [];

  const isArabic = locale === "ar";
  const navItems = [
    { href: "/account/orders", label: t("orderHistory"), icon: Package },
    { href: "/account/wallet", label: "Wallet & Points", icon: Wallet },
    { href: "/account/subscriptions", label: "Subscribe & Save", icon: Repeat },
    { href: "/favorites", label: t("favorites"), icon: Heart },
  ];

  return (
    <div className="savo-account-page">
      <div className="savo-account-sidebar">
        <div className="savo-account-user">
          <span className="savo-account-avatar">{(session.user.email ?? "?")[0].toUpperCase()}</span>
          <div>
            <p className="savo-account-user-name">{session.user.name ?? session.user.email}</p>
            <p className="savo-account-user-email">{session.user.email}</p>
          </div>
        </div>
        <nav className="savo-account-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href as any} className="savo-account-nav-item">
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="savo-account-nav-item savo-account-nav-item--static">
            <MapPin className="h-4 w-4" />
            <span>{t("addresses")}</span>
          </div>
          <SignOutButton label={t("signOut")} className="savo-account-signout" />
        </nav>
      </div>

      <div className="savo-account-main">
        {FEATURE_FLAGS.SAVEO_PLUS_ENABLED && (
          <div className="savo-account-plus-wrap">
            <AccountPlusSummary userId={session.user.id} locale={locale} />
          </div>
        )}

        <div className="savo-account-stats">
          <div className="savo-account-stat-card">
            <Package className="h-5 w-5" />
            <b>{orderCount}</b>
            <span>{t("orderHistory")}</span>
          </div>
          <div className="savo-account-stat-card">
            <Heart className="h-5 w-5" />
            <b>{favoriteCount}</b>
            <span>{t("favorites")}</span>
          </div>
        </div>

        {recentOrders.length > 0 && (
          <div className="savo-account-recent">
            <p className="savo-account-section-label">{isArabic ? "آخر الطلبات" : "Recent orders"}</p>
            <div className="savo-account-recent-list">
              {recentOrders.map((order) => {
                const firstImage = order.supplierOrders[0]?.items[0]?.product?.images[0]?.url;
                const itemCount = order.supplierOrders.reduce((sum, so) => sum + so.items.length, 0);
                return (
                  <Link key={order.id} href={`/account/orders/${order.id}` as any} className="savo-account-order-row">
                    <div className="savo-account-order-img">
                      {firstImage && <img src={firstImage} alt="" />}
                    </div>
                    <div className="savo-account-order-body">
                      <span className="savo-account-order-number">{order.orderNumber}</span>
                      <span className="savo-account-order-meta">{new Date(order.createdAt).toLocaleDateString(isArabic ? "ar-KW" : "en-GB")} · {t("itemsCount", { count: itemCount })}</span>
                    </div>
                    <div className="savo-account-order-right">
                      <OrderStatusBadge status={order.status} />
                      <span className="savo-account-order-total">{formatKWD(Number(order.total))}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link href="/account/orders" className="savo-account-viewall">{isArabic ? "عرض كل الطلبات ←" : "View all orders →"}</Link>
          </div>
        )}

        {recommendedProducts.length > 0 && (
          <div className="savo-account-recommend">
            <ProductRail
              title={isArabic ? "مُختار لك" : "Recommended for You"}
              products={serializeProducts(recommendedProducts) as any}
              source="recommended_for_you"
              locale={locale}
              outOfStockLabel={common("outOfStock")}
              addToCartLabel={pT("addToCart")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
