import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { Package, Heart, MapPin, Wallet, Repeat } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MembershipDashboard } from "@/components/membership/membership-dashboard";
import { MembershipService } from "@/lib/services/membership-service";
import { PlusBadge } from "@/components/membership/plus-badge";
import { CustomerBehaviorEngine } from "@/lib/services/customer-behavior-engine";
import { ProductRail } from "@/components/product/product-grid";
import { serializeProducts } from "@/lib/utils";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const [orderCount, favoriteCount, t, locale, isPlusMember, nextBestProducts] = await Promise.all([
    prisma.order.count({ where: { userId: session.user.id } }),
    prisma.favorite.count({ where: { userId: session.user.id } }),
    getTranslations("account"),
    getLocale(),
    MembershipService.isActiveMember(session.user.id),
    CustomerBehaviorEngine.getNextBestProducts(session.user.id, 6),
  ]);

  const recommendedProducts = nextBestProducts.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: nextBestProducts.map((r) => r.productId) }, status: "ACTIVE" },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {FEATURE_FLAGS.SAVEO_PLUS_ENABLED && isPlusMember && <PlusBadge size="sm" />}
      </div>
      <p className="mt-1 text-saveo-emerald-700/50">{session.user.email}</p>

      {FEATURE_FLAGS.SAVEO_PLUS_ENABLED && (
        <div className="mt-6">
          <MembershipDashboard userId={session.user.id} locale={locale} />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/account/orders" className="card flex items-center gap-4 p-5">
          <Package className="h-8 w-8 text-saveo-emerald-700" />
          <div>
            <p className="font-semibold">{t("orderHistory")}</p>
            <p className="text-xs text-saveo-emerald-700/50">{t("ordersCount", { count: orderCount })}</p>
          </div>
        </Link>
        <Link href="/favorites" className="card flex items-center gap-4 p-5">
          <Heart className="h-8 w-8 text-saveo-emerald-700" />
          <div>
            <p className="font-semibold">{t("favorites")}</p>
            <p className="text-xs text-saveo-emerald-700/50">{t("favoritesCount", { count: favoriteCount })}</p>
          </div>
        </Link>
        <Link href="/account/wallet" className="card flex items-center gap-4 p-5">
          <Wallet className="h-8 w-8 text-saveo-emerald-700" />
          <div>
            <p className="font-semibold">Wallet &amp; Points</p>
            <p className="text-xs text-saveo-emerald-700/50">Store credit and loyalty points</p>
          </div>
        </Link>
        <Link href="/account/subscriptions" className="card flex items-center gap-4 p-5">
          <Repeat className="h-8 w-8 text-saveo-emerald-700" />
          <div>
            <p className="font-semibold">Subscribe &amp; Save</p>
            <p className="text-xs text-saveo-emerald-700/50">Manage recurring deliveries</p>
          </div>
        </Link>
        <div className="card flex items-center gap-4 p-5">
          <MapPin className="h-8 w-8 text-saveo-emerald-700" />
          <div>
            <p className="font-semibold">{t("addresses")}</p>
            <p className="text-xs text-saveo-emerald-700/50">{t("addressesSubtitle")}</p>
          </div>
        </div>
        <SignOutButton label={t("signOut")} />
      </div>

      {recommendedProducts.length > 0 && (
        <div className="mt-8">
          <ProductRail
            title={locale === "ar" ? "مُختار لك" : "Recommended for You"}
            products={serializeProducts(recommendedProducts) as any}
            source="recommended_for_you"
          />
        </div>
      )}
    </div>
  );
}
