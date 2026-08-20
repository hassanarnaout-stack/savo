import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ProductGrid } from "@/components/product/product-grid";
import { serializeProducts } from "@/lib/utils";
import { getTranslations, getLocale } from "next-intl/server";

/**
 * SAVO Favorites — exact V22 visual transplant (FavoritesPage,
 * V22 CustomerPages.tsx): eyebrow + large title + saved count header,
 * V22's distinctive discovery-oriented empty state (decorative teal
 * arc + heart) when there are zero real saved products, otherwise the
 * real ProductGrid (unchanged — used across the app, not modified
 * just for this page's empty state). ALL business logic below is
 * byte-for-byte unchanged: same prisma.favorite.findMany query
 * (userId-scoped), same auth redirect, same product serialization.
 */
export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/favorites");

  const [favorites, t, common, pT, locale] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
      orderBy: { createdAt: "desc" },
    }),
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("product"),
    getLocale(),
  ]);

  const products = favorites.map((f) => f.product);
  const isArabic = locale === "ar";

  return (
    <div className="savo-favorites-page">
      <div className="savo-favorites-header">
        <div>
          <p className="savo-favorites-eyebrow">{isArabic ? "المفضلة" : "Saved by you"}</p>
          <h1 className="savo-favorites-title">{t("favorites")}</h1>
        </div>
        <div className="savo-favorites-count">{products.length} {isArabic ? "منتجات محفوظة" : "saved"}</div>
      </div>

      <div className="savo-favorites-body">
        {products.length === 0 ? (
          <div className="savo-favorites-empty">
            <div className="savo-favorites-empty-icon">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <path d="M 95,60 A 35,35 0 1 0 60,95" stroke="var(--savo-shell-discovery)" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
                <circle cx="95" cy="60" r="5" fill="var(--savo-shell-discovery)" opacity="0.35" />
                <path d="M 85,60 A 25,25 0 1 0 60,85" stroke="var(--savo-shell-discovery)" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
              </svg>
              <span className="savo-favorites-empty-heart">♡</span>
            </div>
            <h2 className="savo-favorites-empty-title">{isArabic ? "لا شيء محفوظ بعد." : "Nothing saved yet."}</h2>
            <p className="savo-favorites-empty-sub">
              {isArabic
                ? "اكتشافك القادم يبعد نقرة واحدة. ابدأ بتصفح المنتجات واحفظ ما يعجبك."
                : "Your next discovery is one tap away. Browse products and save the ones that catch your eye."}
            </p>
            <Link href="/products" className="savo-favorites-empty-cta">{isArabic ? "ابدأ الاكتشاف" : "Start Discovering"}</Link>
          </div>
        ) : (
          <ProductGrid
            products={serializeProducts(products) as any}
            noResultsLabel={common("noResults")}
            continueShoppingLabel={common("continueShopping")}
            outOfStockLabel={common("outOfStock")}
            addToCartLabel={pT("addToCart")}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}
