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
    <footer className="mt-20 border-t border-white/[0.08] bg-saveo-ink-mid font-manrope text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Image src="/brand/savo-logo-light.png" alt="Savo" width={104} height={36} className="h-8 w-auto" />
            <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-saveo-muted">{brand("tagline")}</p>
            <p className="mt-2 text-xs text-saveo-subtle">
              {locale === "ar" ? "منصة الكويت الذكية للتوفير." : "Kuwait's smart savings marketplace."}
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-[13px] font-bold text-white">{t("shop")}</h4>
            <ul className="space-y-[11px] text-[13px] text-saveo-muted">
              <li><Link href="/discover" className="transition-colors hover:text-saveo-primary">🔍 Discover</Link></li>
              <li><Link href="/brands" className="transition-colors hover:text-saveo-primary">🏷️ Brands</Link></li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className="transition-colors hover:text-saveo-primary">
                    {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[13px] font-bold text-white">{t("account")}</h4>
            <ul className="space-y-[11px] text-[13px] text-saveo-muted">
              <li><Link href="/account" className="transition-colors hover:text-saveo-primary">{account("title")}</Link></li>
              <li><Link href="/account/orders" className="transition-colors hover:text-saveo-primary">{account("orderHistory")}</Link></li>
              <li><Link href="/favorites" className="transition-colors hover:text-saveo-primary">{account("favorites")}</Link></li>
              <li><Link href="/gift-cards" className="transition-colors hover:text-saveo-primary">Gift Cards</Link></li>
              <li><Link href="/account/messages" className="transition-colors hover:text-saveo-primary">Messages</Link></li>
              {affiliateProgramEnabled && (
                <li><Link href="/affiliate" className="transition-colors hover:text-saveo-primary">Become an Affiliate</Link></li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[13px] font-bold text-white">{t("support")}</h4>
            <ul className="space-y-[11px] text-[13px] text-saveo-muted">
              <li>help@saveo.com.kw</li>
              <li>{locale === "ar" ? "مدينة الكويت، الكويت" : "Kuwait City, Kuwait"}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/[0.08] pt-6 text-xs text-saveo-subtle">
          © {new Date().getFullYear()} Savo. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
