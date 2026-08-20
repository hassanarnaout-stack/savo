import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { SubscriptionsManager } from "@/components/account/subscriptions-manager";

/**
 * SAVO Subscribe & Save — enhanced V22 view: hero copy + real stat
 * summary + filter tabs + richer subscription cards, PLUS a real
 * "Eligible for Subscribe & Save" browse section so the customer
 * doesn't have to go hunting through the whole catalog to find
 * subscribable products. Real business logic byte-for-byte
 * unchanged: same SubscriptionService.getForUser() query, same
 * SubscriptionControls (Pause/Resume/Cancel). Eligible products are
 * real ACTIVE, isSubscribable=true products (the same admin-controlled
 * flag from the product form), excluding ones already subscribed to —
 * zero mock products, zero products the admin hasn't explicitly
 * opted in.
 */
export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/subscriptions");

  const [subscriptions, locale] = await Promise.all([
    SubscriptionService.getForUser(session.user.id),
    getLocale(),
  ]);

  const subscribedProductIds = subscriptions.filter((s) => s.status !== "CANCELLED").map((s) => (s as any).productId ?? (s as any).product?.id).filter(Boolean);
  const eligibleProducts = await prisma.product.findMany({
    where: { isSubscribable: true, status: "ACTIVE", id: { notIn: subscribedProductIds } },
    select: { id: true, name: true, nameAr: true, brandName: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    take: 8,
  });

  return (
    <div className="savo-subs-page">
      <SubscriptionsManager
        subscriptions={subscriptions as any}
        eligibleProducts={eligibleProducts.map((p) => ({ ...p, saveoPrice: Number(p.saveoPrice) })) as any}
        isArabic={locale === "ar"}
      />
    </div>
  );
}
