import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { FeatureFlagService } from "@/lib/services/feature-flag-service";
import { SavoLogo } from "@/components/layout/savo-logo";

async function getFeaturedCategories() {
  try {
    return await prisma.category.findMany({
      where: { isActive: true, isFeatured: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      take: 4,
      select: { id: true, name: true, nameAr: true, slug: true },
    });
  } catch {
    return [];
  }
}

export async function Footer() {
  const [t, brand, account, categories, locale, affiliateProgramEnabled] = await Promise.all([
    getTranslations("footer"),
    getTranslations("brand"),
    getTranslations("account"),
    getFeaturedCategories(),
    getLocale(),
    FeatureFlagService.isEnabled("affiliate_program").catch(() => false),
  ]);
  const isArabic = locale === "ar";

  return (
    <footer className="savo-site-footer">
      <div className="savo-footer-inner">
        <div className="savo-footer-grid">
          <div className="savo-footer-brand">
            <div className="savo-footer-logo-stage"><SavoLogo height={36} tagline /></div>
            <p>{brand("tagline")}</p>
            <p lang="ar" dir="rtl">سافو — عالمك للاكتشاف في الكويت</p>
          </div>

          <div className="savo-footer-column">
            <h3>{t("shop")}</h3>
            <Link href="/discover">{isArabic ? "اكتشف" : "Discover"}</Link>
            <Link href="/products?type=DEAL">{isArabic ? "العروض" : "Special Deals"}</Link>
            <Link href="/brands">{isArabic ? "العلامات" : "Brands"}</Link>
            <Link href="/mystery-boxes">{isArabic ? "صناديق المفاجآت" : "Mystery Boxes"}</Link>
            <Link href="/products">{isArabic ? "كل المنتجات" : "All Products"}</Link>
          </div>

          <div className="savo-footer-column">
            <h3>{t("account")}</h3>
            <Link href="/account">{account("title")}</Link>
            <Link href="/account/orders">{account("orderHistory")}</Link>
            <Link href="/favorites">{account("favorites")}</Link>
            <Link href="/gift-cards">{isArabic ? "بطاقات الهدايا" : "Gift Cards"}</Link>
            <Link href="/account/messages">{isArabic ? "الرسائل" : "Messages"}</Link>
            {affiliateProgramEnabled && <Link href="/affiliate">{isArabic ? "برنامج الشركاء" : "Affiliate Program"}</Link>}
          </div>

          <div className="savo-footer-column">
            <h3>{t("support")}</h3>
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                {isArabic && category.nameAr ? category.nameAr : category.name}
              </Link>
            ))}
            <span>help@saveo.com.kw</span>
            <span>{isArabic ? "مدينة الكويت، الكويت" : "Kuwait City, Kuwait"}</span>
          </div>
        </div>

        <div className="savo-footer-bottom">
          <span>© {new Date().getFullYear()} SAVO Kuwait. {t("rights")}</span>
        </div>
      </div>
    </footer>
  );
}
