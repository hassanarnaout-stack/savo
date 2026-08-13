import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Never index account/checkout/admin/supplier areas — no SEO
        // value, and some contain personal/business data.
        disallow: ["/account", "/checkout", "/cart", "/admin", "/supplier", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
