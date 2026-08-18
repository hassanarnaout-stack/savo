import Image from "next/image";
import { ArrowRight, CheckCircle, Gift, Headphones, Shield, Truck, Zap } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { HomeProduct, HomepageViewModel } from "@/lib/homepage-view-model";
import { SavoHour } from "./savo-hour";
import { HeroDiscoveryDisplay } from "./hero-discovery-display";
import { DiscoveryHub } from "./discovery-hub";
import { SAVOSpotlight360 } from "./savo-spotlight";
import { DiscoverBrands } from "./discover-brands";
import { DiscoverTogether } from "./discover-together";
import { MysteryBoxHomeSection } from "./mystery-box-home-section";

const kd = (value: number) => "KD " + value.toFixed(3);

function ProductImage({ product, sizes }: { product: HomeProduct; sizes: string }) {
  return product.image ? <Image src={product.image} alt={product.name} fill sizes={sizes} /> : <span className="v21-image-unavailable">Source image unavailable</span>;
}

function SectionHeader({ eyebrow, title, href, link }: { eyebrow: React.ReactNode; title: string; href?: string; link?: string }) {
  return <header className="v21-section-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{href && <Link href={href}>{link} <ArrowRight size={14} /></Link>}</header>;
}

export function V21Homepage({ data, locale }: { data: HomepageViewModel; locale: string }) {
  return <div className="v21-home">
    <Hero data={data} locale={locale} />
    <SavoHour deal={data.dealOfTheHour} />
    <QuickDiscovery data={data} />
    <Categories categories={data.categories} />
    <DiscoveryHub trending={data.hubTrending} bestSellers={data.hubBestSellers} editorsPicks={data.hubEditorsPicks} locale={locale} />
    <SAVOSpotlight360 />
    <DiscoverBrands insideTheBrand={data.insideTheBrand} locale={locale} />
    <DiscoverTogether bundle={data.discoverTogetherBundle} locale={locale} />
    <MysteryBoxHomeSection tiers={data.mysteryBoxTiers} locale={locale} />
  </div>;
}

/**
 * QuickDiscovery — Phase 3 V22 Homepage Migration.
 * Ported from savo-new/src/App.tsx QuickDiscovery() (horizontal
 * scroll strip, "Today on SAVO / What's Happening Now").
 *
 * Data source: V22's four demo labels (Just Landed, Flash Deal,
 * Editor's, Best Value) map 1:1 onto data already computed by
 * getHomepageViewModel() — data.justLanded, data.flashDeals,
 * data.editorsPicks, data.bestValue. No new query, no second
 * recommendation engine; this is pure composition of existing
 * real Homepage data. Deduplicated by product id so the same
 * product never appears twice if it qualifies for more than one
 * category. Renders nothing if no real items qualify.
 */
type QuickDiscoveryTone = "teal" | "fire" | "gold";
type QuickDiscoveryItem = { id: string; slug: string; name: string; image: string; price: number; originalPrice: number; label: string; tone: QuickDiscoveryTone };

function buildQuickDiscoveryItems(data: HomepageViewModel): QuickDiscoveryItem[] {
  const seen = new Set<string>();
  const items: QuickDiscoveryItem[] = [];
  const take = (
    source: { id: string; slug: string; name: string; image: string | null; price: number; originalPrice: number }[],
    label: string,
    tone: QuickDiscoveryTone,
    max: number,
  ) => {
    let added = 0;
    for (const p of source) {
      if (added >= max || items.length >= 6) break;
      if (seen.has(p.id) || !p.image) continue;
      seen.add(p.id);
      items.push({ id: p.id, slug: p.slug, name: p.name, image: p.image, price: p.price, originalPrice: p.originalPrice, label, tone });
      added++;
    }
  };
  take(data.justLanded, "Just Landed", "teal", 2);
  take(data.flashDeals.map((d) => ({ id: d.id, slug: d.slug, name: d.name, image: d.image, price: d.flashPrice, originalPrice: d.originalPrice })), "Flash Deal", "fire", 2);
  take(data.editorsPicks, "Editor's", "gold", 1);
  take(data.bestValue, "Best Value", "teal", 1);
  return items;
}

function QuickDiscovery({ data }: { data: HomepageViewModel }) {
  const items = buildQuickDiscoveryItems(data);
  if (!items.length) return null;
  return (
    <section className="savo-quick">
      <div className="savo-quick-head">
        <SectionHeader eyebrow="Today on SAVO" title="What's Happening Now" href="/products?sort=newest" link="See all" />
      </div>
      <div className="savo-quick-row">
        {items.map((item) => {
          const pct = Math.max(0, Math.round((1 - item.price / item.originalPrice) * 100));
          return (
            <Link href={'/products/' + item.slug} key={item.id} className="savo-quick-card">
              <span className="savo-quick-media">
                <Image src={item.image} alt={item.name} fill sizes="185px" />
                <span className={'savo-quick-badge savo-quick-badge--' + item.tone}>{item.label}</span>
              </span>
              <span className="savo-quick-info">
                <span className="savo-quick-name">{item.name}</span>
                <span className="savo-quick-price">
                  {kd(item.price)}
                  {pct > 0 && ' · -' + pct + '%'}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Hero — Phase 3 V22 Homepage Migration.
 * Ported from savo-new/src/App.tsx Hero() + HeroDisplay(). Two
 * intentional production adaptations from the V22 source (both real,
 * documented — no fabricated data):
 * 1. Stats row uses real counts (totalProductCount, brands.length,
 *    verifiedSupplierCount) instead of V22's hard-coded "12K+/340+".
 *    "48h Delivery" / "Free Returns" are kept as they're operational
 *    policy statements, not fabricated metrics.
 * 2. The right-side showcase uses real heroProducts in a simplified
 *    card treatment rather than V22's mock per-category effect/
 *    countdown system — the countdown now lives once, for real, in
 *    the dedicated SavoHour section directly below (avoids a second
 *    urgency/countdown engine per the migration rules).
 */
function Hero({ data, locale }: { data: HomepageViewModel; locale: string }) {
  const stats: [string, string][] = [
    [data.totalProductCount >= 1000 ? Math.floor(data.totalProductCount / 1000) + "K+" : String(data.totalProductCount), "Products"],
    [data.brands.length + "+", "Brands"],
    ["48h", "Delivery"],
    ["Free", "Returns"],
  ];
  return (
    <section className="savo-hero">
      <div className="savo-hero-grid">
        <div className="savo-hero-copy">
          <div className="savo-hero-chips">
            <span className="savo-hero-chip savo-hero-chip-teal">Discovery Marketplace</span>
            <span className="savo-hero-chip">{data.brands.length}+ Brands</span>
          </div>
          <h1>
            Your World<br />of <em>Discovery</em>
          </h1>
          <div className="savo-hero-ar" dir="rtl">عالمك للاكتشاف</div>
          <p>
            Open SAVO every day and ask: <em>&quot;What&apos;s here today?&quot;</em>
          </p>
          <div className="savo-hero-actions">
            <Link href="/products?type=DEAL" className="savo-hero-cta-primary">
              <Zap size={17} /> Start Discovering
            </Link>
            <Link href="/products" className="savo-hero-cta-secondary">
              Browse Categories
            </Link>
          </div>
          <div className="savo-hero-stats">
            {stats.map(([value, label]) => (
              <div key={label}>
                <div className="savo-hero-stat-value">{value}</div>
                <div className="savo-hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="savo-hero-products">
          <HeroDiscoveryDisplay products={data.heroProducts} locale={locale} />
        </div>
      </div>
    </section>
  );
}

/**
 * Categories — Phase 3 V22 Homepage Migration.
 * Ported from savo-new/src/App.tsx Categories()/CatTile() — the
 * 6-cell asymmetric editorial mosaic (row 1: 5fr/4fr/3fr, row 2
 * mirrored 3fr/4fr/5fr; mobile: 1 featured + 2-col grid).
 *
 * Real data only: category.count/image/slug all come from
 * getHomepageViewModel() (Prisma) — no V22 demo names ("Fashion",
 * "Beauty & Wellness"...) or fake counts ("3,400+"). Route is the
 * existing real `/category/{slug}` — unchanged.
 *
 * Documented adaptation: V22's mosaic assumes exactly 6 items. Real
 * featured-category count varies, so this renders the exact V22
 * mosaic only when there are 6; with fewer, it falls back to a
 * simple even grid rather than rendering broken/empty mosaic cells
 * or inventing placeholder categories to reach 6.
 */
function Categories({ categories }: { categories: HomepageViewModel["categories"] }) {
  if (!categories.length) return null;
  const isMosaic = categories.length >= 6;
  const items = isMosaic ? categories.slice(0, 6) : categories;

  return (
    <section className="savo-categories">
      <div className="savo-categories-head">
        <SectionHeader eyebrow="Browse SAVO" title="Shop by Category" href="/products" link="All categories" />
      </div>
      {isMosaic ? (
        <div className="savo-cat-mosaic">
          {items.map((category, i) => (
            <CatTile key={category.id} category={category} featured={i === 0 || i === 5} tileIndex={i} />
          ))}
        </div>
      ) : (
        <div className="savo-cat-fallback-grid">
          {items.map((category, i) => (
            <CatTile key={category.id} category={category} featured={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function CatTile({
  category, featured = false, tileIndex,
}: {
  category: HomepageViewModel["categories"][number]; featured?: boolean; tileIndex?: number;
}) {
  return (
    <Link
      href={'/category/' + category.slug}
      className={['savo-cat-tile', featured && 'is-featured', typeof tileIndex === 'number' && 'tile-' + tileIndex].filter(Boolean).join(' ')}
    >
      {category.image && <Image src={category.image} alt="" fill sizes="(max-width: 900px) 50vw, 33vw" className="object-cover" />}
      <div className="savo-cat-tile-scrim" />
      <div className="savo-cat-tile-copy">
        <div className="savo-cat-tile-name">{category.name}</div>
        {category.nameAr && <div className="savo-cat-tile-name-ar" dir="rtl">{category.nameAr}</div>}
        <div className="savo-cat-tile-footer">
          <span className="savo-cat-tile-count">{category.count} {category.count === 1 ? "item" : "items"}</span>
          <span className="savo-cat-tile-browse">Browse →</span>
        </div>
      </div>
    </Link>
  );
}

function Brands({ brands }: { brands: HomepageViewModel["brands"] }) {
  const themes = [["#1A1000", "#F59E0B"], ["#001A15", "#00C9A7"], ["#1A0800", "#FF4D2E"], ["#100A1A", "#A78BFA"]];
  if (!brands.length) return null;
  return <section className="v21-brands"><div className="v21-shell"><SectionHeader eyebrow="Shop by Brand · تسوق حسب الماركة" title="The names you trust." href="/brands" link="All Brands" /><div className={'v21-brand-grid count-' + Math.min(4, brands.length)}>{brands.slice(0, 4).map((brand, index) => <Link href={'/brands/' + brand.slug} key={brand.slug} style={{ "--brand": themes[index][0], "--accent": themes[index][1] } as React.CSSProperties}><i /><h3>{brand.name}</h3><p>Explore approved products from {brand.name}.</p><footer><span>{brand.count} {brand.count === 1 ? "product" : "products"}</span><ArrowRight size={15} /></footer></Link>)}</div></div></section>;
}

function Mystery({ boxes }: { boxes: HomeProduct[] }) {
  if (!boxes.length) return null;
  const minimum = Math.min(...boxes.map((box) => box.price));
  const maximum = Math.max(...boxes.map((box) => box.mysteryValueMax ?? box.originalPrice));
  return <section className="v21-mystery">{boxes.slice(0, 3).map((box, index) => <span className={'v21-mystery-hint h' + (index + 1)} key={box.id}><ProductImage product={box} sizes="90px" /></span>)}<div><span className="v21-mystery-icon">📦</span><p><Gift size={14} /> MYSTERY BOX · صندوق المفاجأة</p><h2>WHAT WILL<br />YOU <em>DISCOVER?</em></h2><p>Configured surprise boxes from approved SAVO suppliers — every tier uses real catalog pricing and availability.</p><div className="v21-mystery-value"><span><small>Configured value up to</small><del>{kd(maximum)}</del></span><i /><span><small>Your SAVO price</small><strong>From {kd(minimum)}</strong></span></div><div className="v21-mystery-actions"><Link href="/mystery-boxes">REVEAL YOUR BOX</Link><Link href="/mystery-boxes">See What&apos;s Inside</Link></div></div></section>;
}

function Trust({ verifiedSupplierCount }: { verifiedSupplierCount: number }) {
  const pillars = [[Shield, "Approved Suppliers", "مورّدون معتمدون", verifiedSupplierCount + " approved suppliers currently support this storefront."], [Truck, "Order Tracking", "تتبّع الطلبات", "Track eligible orders from dispatch through delivery."], [Headphones, "Customer Support", "دعم العملاء", "Operational account and support routes remain connected."], [CheckCircle, "Live Availability", "توفر مباشر", "Deal stock and product availability come from operational records."]] as const;
  return <section className="v21-trust"><div className="v21-shell"><header><p>Why SAVO</p><h2>Built for discovery.</h2><span dir="rtl">مبني للاكتشاف</span></header><div>{pillars.map(([Icon, title, titleAr, body]) => <article key={title}><Icon size={24} /><h3>{title}</h3><p dir="rtl">{titleAr}</p><small>{body}</small></article>)}</div></div></section>;
}
