import Image from "next/image";
import { ArrowRight, BookOpen, CheckCircle, Gift, Headphones, Search, Shield, TrendingUp, Truck, Zap } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { HomeProduct, HomepageViewModel } from "@/lib/homepage-view-model";
import { FlashDealsClient, HomeCountdown, ProductCommerceSections } from "./v21-home-client";

const kd = (value: number) => "KD " + value.toFixed(3);
const discount = (product: HomeProduct) => Math.max(0, Math.round((1 - product.price / product.originalPrice) * 100));

function ProductImage({ product, sizes }: { product: HomeProduct; sizes: string }) {
  return product.image ? <Image src={product.image} alt={product.name} fill sizes={sizes} /> : <span className="v21-image-unavailable">Source image unavailable</span>;
}

function SectionHeader({ eyebrow, title, href, link }: { eyebrow: React.ReactNode; title: string; href?: string; link?: string }) {
  return <header className="v21-section-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{href && <Link href={href}>{link} <ArrowRight size={14} /></Link>}</header>;
}

export function V21Homepage({ data, locale }: { data: HomepageViewModel; locale: string }) {
  return <div className="v21-home">
    <section className="v21-hero"><div className="v21-hero-grid"><div className="v21-hero-copy">{data.flashDeals[0] && <div className="v21-sale-pill"><i /><span>Flash Sale ends in</span><HomeCountdown endsAt={data.flashDeals[0].endsAt} /></div>}<h1>DISCOVER<br />THE<br /><em>EXCEPTIONAL</em></h1><p dir="rtl">عالمك للاكتشاف — منتجات استثنائية بأسعار لا تُصدّق</p><form action={'/' + locale + '/products'} className="v21-hero-search"><Search size={16} /><input name="q" placeholder={locale === "ar" ? "ابحث عن المنتجات..." : "Search deals..."} /></form><div className="v21-hero-actions"><Link href="/products?type=DEAL"><Zap size={17} /> Shop Flash Deals</Link><Link href="/mystery-boxes">Open Mystery Box</Link></div></div><div className="v21-hero-products">{data.heroProducts.map((product, index) => <Link href={'/products/' + product.slug} key={product.id} style={{ "--delay": index * .9 + "s" } as React.CSSProperties}><span className="v21-hero-thumb"><ProductImage product={product} sizes="58px" /></span><div><small>{product.brand ?? product.category}</small><h3>{product.name}</h3><p><strong>{kd(product.price)}</strong><del>{kd(product.originalPrice)}</del>{discount(product) > 0 && <b>-{discount(product)}%</b>}</p></div></Link>)}</div></div></section>
    <Ticker />
    <FlashDealsClient deals={data.flashDeals} />
    <Trending products={data.trending} />
    <Editors products={data.editorsPicks} />
    <Categories categories={data.categories} />
    <Brands brands={data.brands} />
    <Mystery boxes={data.mysteryBoxes} />
    <ProductCommerceSections justLanded={data.justLanded} bestValue={data.bestValue} endingSoon={data.endingSoon} />
    <Trust verifiedSupplierCount={data.verifiedSupplierCount} />
  </div>;
}

function Ticker() {
  const items = ["✨ Discover real SAVO savings", "🛍️ Products from approved suppliers", "📦 Track eligible orders", "🛟 Rescue Deals show expiry information", "🎁 Mystery Boxes use configured value ranges", "🌍 Shop in English or Arabic", "⚡ Live deals use allocated stock", "✓ Real products. Real availability."];
  return <div className="v21-ticker"><div>{[...items, ...items].map((item, index) => <span key={item + index}>{item}</span>)}</div></div>;
}

function Trending({ products }: { products: HomeProduct[] }) {
  if (!products.length) return null;
  return <section className="v21-trending"><div className="v21-shell"><SectionHeader eyebrow={<><TrendingUp size={13} /> Trending Now · الأكثر رواجًا</>} title="What's hot right now." href="/products?sort=popular" link="See all trending" /><div className="v21-trending-grid">{products.map((product, index) => <Link href={'/products/' + product.slug} key={product.id} className={index === 0 ? "featured" : ""}><div className="v21-image"><ProductImage product={product} sizes={index === 0 ? "(max-width: 900px) 100vw, 35vw" : "(max-width: 900px) 44vw, 280px"} /><span>{["TRENDING NOW", "#1 TODAY", "MOST SAVED", "GOING FAST"][index]}</span></div><section><small>{product.brand ?? product.category}</small><h3>{product.name}</h3><p><strong>{kd(product.price)}</strong><del>{kd(product.originalPrice)}</del></p></section></Link>)}</div></div></section>;
}

function Editors({ products }: { products: HomeProduct[] }) {
  if (!products.length) return null;
  const [hero, ...support] = products;
  return <section className="v21-editors"><div className="v21-shell"><SectionHeader eyebrow={<><BookOpen size={13} /> Editor&apos;s Selection · اختيارات المحرر</>} title="Curated for you." href="/products?badge=EDITORS_PICK" link="See all picks" /><div className="v21-editors-grid"><Link className="v21-editors-hero" href={'/products/' + hero.slug}><ProductImage product={hero} sizes="(max-width: 900px) 100vw, 50vw" /><i /><span>EDITOR&apos;S CHOICE</span><div>{hero.nameAr && <small dir="rtl">{hero.nameAr}</small>}<h3>{hero.name}</h3><p><strong>{kd(hero.price)}</strong><del>{kd(hero.originalPrice)}</del></p></div></Link><div className="v21-editors-support">{support.map((product, index) => <Link href={'/products/' + product.slug} key={product.id}><span className="v21-editors-thumb"><ProductImage product={product} sizes="160px" /></span><section><b>EDITORS PICK #{index + 2}</b><small>{product.brand ?? product.category}</small><h3>{product.name}</h3>{product.nameAr && <p dir="rtl">{product.nameAr}</p>}<strong>{kd(product.price)}</strong></section></Link>)}<Link className="v21-editors-cta" href="/products?badge=EDITORS_PICK">Explore all Editor&apos;s Picks <ArrowRight size={16} /></Link></div></div></div></section>;
}

function Categories({ categories }: { categories: HomepageViewModel["categories"] }) {
  const themes = [["#2C1810", "#D97706"], ["#0F1F17", "#00C9A7"], ["#1C0F1A", "#E879A0"], ["#0A1628", "#60A5FA"]];
  if (!categories.length) return null;
  return <section className="v21-categories"><div className="v21-shell"><SectionHeader eyebrow="Shop by Category · تسوق حسب الفئة" title="Your world, your choice." href="/products" link="All categories" /><div className="v21-category-grid">{categories.map((category, index) => <Link href={'/category/' + category.slug} key={category.id} style={{ "--world": themes[index][0], "--accent": themes[index][1] } as React.CSSProperties}>{category.image && <Image src={category.image} alt="" fill sizes="(max-width: 900px) 50vw, 25vw" />}<i /><div><h3>{category.name.toUpperCase()}</h3>{category.nameAr && <p dir="rtl">{category.nameAr}</p>}<footer><strong>{category.count} {category.count === 1 ? "product" : "products"}</strong><span><ArrowRight size={14} /></span></footer></div></Link>)}</div></div></section>;
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
