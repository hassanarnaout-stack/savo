import { prisma } from "@/lib/prisma";
import { Search, Heart, User } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CartButton } from "@/components/cart/cart-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { PlusBadge } from "@/components/membership/plus-badge";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { SAVOLogo } from "@/components/brand/savo-master-logo";
import { DesktopNavigation } from "@/components/layout/storefront-navigation";
import { AnnouncementTicker } from "@/components/layout/announcement-ticker";

const SHELL_ANNOUNCEMENTS = [
  "🚚 Free delivery on SAVO Plus orders",
  "🎁 New Mystery Boxes every week",
  "🇰🇼 Shop in English or Arabic",
];

async function getFeaturedCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, isFeatured: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        nameAr: true,
        slug: true,
        icon: true,
        _count: { select: { products: { where: { status: "ACTIVE", approvalStatus: "APPROVED" } } } },
      },
    });
    return categories
      .filter((category) => category._count.products > 0)
      .sort((a, b) => b._count.products - a._count.products);
  } catch {
    // The global shell remains available during a temporary catalog outage;
    // category links repopulate automatically when Prisma is reachable.
    return [];
  }
}

export async function Header() {
  const [categories, nav, locale, session] = await Promise.all([
    getFeaturedCategories(),
    getTranslations("nav"),
    getLocale(),
    auth(),
  ]);
  const isPlusMember = session?.user?.id ? await MembershipService.isActiveMember(session.user.id) : false;

  return (
    <header className="savo-site-header">
      <AnnouncementTicker items={SHELL_ANNOUNCEMENTS} />
      <div className="savo-header-primary">
        <Link href="/" className="savo-header-logo" aria-label="SAVO home">
          <SAVOLogo variant="primary-light" style={{ height: 28, width: "auto" }} />
        </Link>

        <DesktopNavigation locale={locale} />

        <form action={`/${locale}/products`} className="savo-header-search">
          <div>
            <Search aria-hidden="true" />
            <input
              name="q"
              placeholder={nav("search")}
              aria-label={nav("search")}
            />
          </div>
        </form>

        <div className="savo-header-actions">
          <Link href="/products" className="savo-mobile-search" aria-label={nav("search")}>
            <Search />
          </Link>
          <LocaleSwitcher currentLocale={locale} />
          <Link
            href="/favorites"
            className="savo-header-action savo-wishlist-action"
            aria-label={nav("favorites")}
          >
            <Heart />
          </Link>
          <Link
            href="/account"
            className="savo-header-action savo-account-action"
            aria-label={nav("account")}
          >
            <User />
            {isPlusMember && (
              <span className="savo-plus-indicator">
                <PlusBadge size="xs" variant="dark" />
              </span>
            )}
          </Link>
          <CartButton />
          <MobileNav categories={categories} locale={locale} />
        </div>
      </div>
    </header>
  );
}
