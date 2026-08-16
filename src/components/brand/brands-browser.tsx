"use client";

/**
 * The only interactive piece of /brands — live search filtering over
 * the real brand list already fetched server-side. Kept as a small
 * client island (not a "use client" page) per the performance rules
 * already established for /products.
 */
import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";

interface Brand { name: string; slug: string; productCount: number }

const ACCENTS = ["teal", "gold", "fire"] as const;

export function BrandsBrowser({ brands, featured, isArabic }: { brands: Brand[]; featured: Brand[]; isArabic: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = query ? brands.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())) : brands;

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="savo-brands-page">
      <div className="savo-brands-intro">
        <div className="savo-products-eyebrow">{isArabic ? "اكتشف بالعلامة" : "Discover by Brand"}</div>
        <div className="savo-products-heading-row">
          <h1>{isArabic ? "ابحث عن العلامات التي تعرفها." : "Find the names you know."}</h1>
          <span className="savo-products-count">{brands.length} {isArabic ? "علامة" : "brands"}</span>
        </div>
        <p className="savo-brands-sub">{isArabic ? "واكتشف التي لا تعرفها بعد." : "Discover the ones you don't."}</p>
      </div>

      {featured.length > 0 && (
        <div className="savo-brands-featured">
          <div className="savo-brands-section-label">{isArabic ? "علامات مميزة" : "Featured brands"}</div>
          <div className="savo-brands-featured-grid">
            {featured.map((b, i) => (
              <Link key={b.slug} href={`/brands/${b.slug}`} className={`savo-brand-card savo-brand-card--${ACCENTS[i % ACCENTS.length]}`}>
                <span className="savo-brand-card-logo">{b.name[0]}</span>
                <span className="savo-brand-card-name">{b.name}</span>
                <span className="savo-brand-card-count">{b.productCount} {isArabic ? "منتج" : "products"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="savo-brands-all">
        <div className="savo-brands-section-label">{isArabic ? "جميع العلامات" : "All brands"}</div>
        <div className="savo-brands-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isArabic ? "ابحث عن علامة تجارية..." : "Search brands..."}
            dir={isArabic ? "rtl" : "ltr"}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="savo-products-empty">
            <div className="savo-products-empty-title">{isArabic ? "لا نتائج" : "No brands found"}</div>
            <div className="savo-products-empty-copy">{isArabic ? "حاول كلمة مختلفة." : "Try a different search."}</div>
          </div>
        ) : (
          <div className="savo-brands-grid">
            {filtered.map((b) => (
              <Link key={b.slug} href={`/brands/${b.slug}`} className="savo-brands-row">
                <span className="savo-brands-row-avatar">{b.name[0]}</span>
                <span className="savo-brands-row-name">{b.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
