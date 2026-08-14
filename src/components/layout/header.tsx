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
    // Figma Make's SavoHeader is built on the `ink` surface (not a light
    // header), with `inkMid` for the search field and the nav strip below it.
    <header className="sticky top-0 z-40 bg-saveo-ink font-manrope">
      {/* Top strip — kept, restyled onto ink */}
      <div className="bg-saveo-ink-low py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-saveo-primary">
        {nav("freeDeliveryBanner")}
      </div>

      {/* Row 1: Logo + Search + Icons — ported 1:1 from Figma's row-1 layout */}
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3.5 sm:px-6 lg:px-8">
        <MobileNav categories={categories} locale={locale} />

        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <Image src="/brand/savo-logo-light.png" alt="Savo" width={104} height={36} className="h-8 w-auto" priority />
        </Link>

        <form action={`/${locale}/products`} className="hidden max-w-xl flex-1 md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-saveo-muted" />
            <input
              name="q"
              placeholder={nav("search")}
              className="w-full rounded-[10px] border border-white/[0.08] bg-saveo-ink-mid py-2.5 ps-10 pe-4 text-sm text-white placeholder:text-saveo-muted outline-none transition-shadow focus:border-saveo-primary focus:shadow-[0_0_0_3px_rgba(0,201,167,0.18)]"
            />
          </div>
        </form>

        <div className="ms-auto flex items-center gap-1 text-white">
          <LocaleSwitcher currentLocale={locale} />
          <Link
            href="/favorites"
            className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/5 sm:flex"
            aria-label={nav("favorites")}
          >
            <Heart className="h-5 w-5 text-saveo-muted transition-colors hover:text-saveo-accent" />
          </Link>
          <Link
            href="/account"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/5 sm:flex"
            aria-label={nav("account")}
          >
            <User className="h-5 w-5 text-saveo-muted" />
            {isPlusMember && (
              <span className="absolute -top-1 -end-1">
                <PlusBadge size="xs" />
              </span>
            )}
          </Link>
          <div className="rounded-full transition-colors hover:bg-white/5">
            <CartButton />
          </div>
        </div>
      </div>

      {/* Row 2: category nav (desktop) — same ink-mid strip Figma uses for its
          primary nav row, with the same muted → white hover treatment and a
          teal bottom border on hover instead of Figma's "active" state (this
          bar is 100% Prisma-driven categories, not a fixed page menu). */}
      <nav className="hidden border-t border-white/[0.08] bg-saveo-ink-mid md:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-1 px-4 sm:px-6 lg:px-8">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-4 py-3.5 text-[13px] font-semibold text-saveo-muted transition-colors hover:border-saveo-primary hover:text-white"
            >
              {cat.icon && <span>{cat.icon}</span>}
              {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
              <span className="text-saveo-subtle">({cat._count.products})</span>
            </Link>
          ))}
          <Link
            href="/products"
            className="ms-auto whitespace-nowrap px-4 py-3.5 text-[13px] font-bold text-saveo-primary"
          >
            {nav("shopAll")} {locale === "ar" ? "←" : "→"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
