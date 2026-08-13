import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { Search, Heart, User } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CartButton } from "@/components/cart/cart-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { PlusBadge } from "@/components/membership/plus-badge";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";

async function getFeaturedCategories() {
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
  // Real fix: an empty category (0 live products) adds nothing to primary
  // navigation and just crowds the bar — it's still reachable via the full
  // products page. Categories with real inventory always show first.
  return categories
    .filter((c) => c._count.products > 0)
    .sort((a, b) => b._count.products - a._count.products);
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
    <header className="sticky top-0 z-40 border-b border-saveo-emerald-700/10 bg-white/95 backdrop-blur">
      {/* Top strip */}
      <div className="bg-saveo-emerald-700 text-center text-xs font-medium text-saveo-gold-400 py-1.5 px-4">
        {nav("freeDeliveryBanner")}
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <MobileNav categories={categories} locale={locale} />

        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <Image src="/brand/savo-logo-dark.png" alt="Savo" width={104} height={36} className="h-8 w-auto" priority />
        </Link>

        <form action={`/${locale}/products`} className="hidden flex-1 max-w-xl md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-saveo-emerald-700/40" />
            <input
              name="q"
              placeholder={nav("search")}
              className="w-full rounded-full border border-saveo-emerald-700/10 bg-saveo-emerald-700/[0.03] py-2.5 ps-10 pe-4 text-sm outline-none focus:border-saveo-gold-400 focus:bg-white"
            />
          </div>
        </form>

        <div className="ms-auto flex items-center gap-1">
          <LocaleSwitcher currentLocale={locale} />
          <Link
            href="/favorites"
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full hover:bg-saveo-emerald-700/5"
            aria-label={nav("favorites")}
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href="/account"
            className="relative hidden sm:flex h-10 w-10 items-center justify-center rounded-full hover:bg-saveo-emerald-700/5"
            aria-label={nav("account")}
          >
            <User className="h-5 w-5" />
            {isPlusMember && (
              <span className="absolute -top-1 -end-1">
                <PlusBadge size="xs" />
              </span>
            )}
          </Link>
          <CartButton />
        </div>
      </div>

      {/* Category nav — 100% data-driven, no hard-coded categories */}
      <nav className="hidden md:block border-t border-saveo-emerald-700/5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-saveo-emerald-700/70 hover:text-saveo-gold-500"
            >
              {cat.icon && <span>{cat.icon}</span>}
              {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
              <span className="text-saveo-emerald-700/40">({cat._count.products})</span>
            </Link>
          ))}
          <Link
            href="/products"
            className="whitespace-nowrap text-sm font-semibold text-saveo-gold-500"
          >
            {nav("shopAll")} {locale === "ar" ? "←" : "→"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
