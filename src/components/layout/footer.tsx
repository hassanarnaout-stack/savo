import { Link } from "@/i18n/routing";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { FeatureFlagService } from "@/lib/services/feature-flag-service";

async function getFeaturedCategories() {
  return prisma.category.findMany({
    where: { isActive: true, isFeatured: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, nameAr: true, slug: true },
  });
}

export async function Footer() {
  const [t, brand, account, categories, locale, affiliateProgramEnabled] = await Promise.all([
    getTranslations("footer"),
    getTranslations("brand"),
    getTranslations("account"),
    getFeaturedCategories(),
    getLocale(),
    FeatureFlagService.isEnabled("affiliate_program"),
  ]);

  return (
    <footer className="bg-saveo-emerald-700 text-white mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Image src="/brand/savo-logo-light.png" alt="Savo" width={104} height={36} className="h-8 w-auto" />
            <p className="mt-3 text-sm text-white/60">{brand("tagline")}</p>
            <p className="mt-1 text-xs text-white/40">
              {locale === "ar" ? "منصة الكويت الذكية للتوفير." : "Kuwait's smart savings marketplace."}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">{t("shop")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li><Link href="/discover">🔍 Discover</Link></li>
              <li><Link href="/brands">🏷️ Brands</Link></li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`}>
                    {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">{t("account")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li><Link href="/account">{account("title")}</Link></li>
              <li><Link href="/account/orders">{account("orderHistory")}</Link></li>
              <li><Link href="/favorites">{account("favorites")}</Link></li>
              <li><Link href="/gift-cards">Gift Cards</Link></li>
              <li><Link href="/account/messages">Messages</Link></li>
              {affiliateProgramEnabled && <li><Link href="/affiliate">Become an Affiliate</Link></li>}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">{t("support")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>help@saveo.com.kw</li>
              <li>{locale === "ar" ? "مدينة الكويت، الكويت" : "Kuwait City, Kuwait"}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} Savo. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
