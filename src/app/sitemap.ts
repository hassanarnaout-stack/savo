import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const locales = ["en", "ar"];

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", approvalStatus: "APPROVED", isMembersOnly: false }, // never index member-exclusive products
      select: { slug: true, updatedAt: true },
      take: 5000, // sane cap — see PRODUCTION.md if the catalog grows beyond this
    }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);

  const staticPaths = ["", "/products", "/mystery-boxes"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        changeFrequency: path === "" ? "daily" : "hourly",
        priority: path === "" ? 1 : 0.8,
      });
    }
    for (const category of categories) {
      entries.push({ url: `${siteUrl}/${locale}/category/${category.slug}`, changeFrequency: "daily", priority: 0.7 });
    }
    for (const product of products) {
      entries.push({
        url: `${siteUrl}/${locale}/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  }

  return entries;
}
