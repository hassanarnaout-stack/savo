"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import type { HomeDeal, HomeProduct } from "@/lib/homepage-view-model";

export function HomeCountdown({ endsAt, segmented = false, labels = false }: { endsAt: string; segmented?: boolean; labels?: boolean }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Date.parse(endsAt) - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  if (remaining == null) return <span className={segmented ? "v21-countdown segmented" : "v21-countdown"}>--:--:--</span>;
  const total = Math.floor(remaining / 1000);
  const parts = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map((value) => String(value).padStart(2, "0"));
  return <span className={segmented ? "v21-countdown segmented" : "v21-countdown"}><span><b>{parts[0]}</b>{labels && <small>HRS</small>}</span><i>:</i><span><b>{parts[1]}</b>{labels && <small>MIN</small>}</span><i>:</i><span><b>{parts[2]}</b>{labels && <small>SEC</small>}</span></span>;
}

function AddButton({ product, price = product.price, label = "Add to Cart" }: { product: HomeProduct; price?: number; label?: string }) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  function add() {
    if (product.stock < 1) return;
    addItem({ productId: product.id, name: product.name, slug: product.slug, image: product.image, originalPrice: product.originalPrice, saveoPrice: price, stockQty: product.stock });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
    toast.success(product.name + " added to cart");
  }
  return <button type="button" className={added ? "v21-add is-added" : "v21-add"} onClick={add} disabled={product.stock < 1}>{added ? <><Check size={15} /> Added</> : <><ShoppingCart size={15} /> {label}</>}</button>;
}

function Price({ product, price = product.price }: { product: HomeProduct; price?: number }) {
  return <p className="v21-price"><strong>KD {price.toFixed(3)}</strong>{product.originalPrice > price && <del>KD {product.originalPrice.toFixed(3)}</del>}</p>;
}

function Stock({ deal }: { deal: HomeDeal }) {
  const remaining = Math.max(0, deal.stockLimit - deal.soldCount);
  const pct = Math.max(0, Math.min(100, (remaining / deal.stockLimit) * 100));
  return <div className="v21-stock"><span>{remaining} deal units left</span><i><b style={{ width: pct + "%" }} /></i></div>;
}

export function FlashDealsClient({ deals }: { deals: HomeDeal[] }) {
  if (!deals.length) return null;
  const featured = deals[0];
  return <section className="v21-flash" id="flash-deals"><div className="v21-flash-event"><div><i /><strong>FLASH DEALS LIVE</strong><span>· عروض فلاش مباشرة</span></div><div><small>ENDS IN</small><HomeCountdown endsAt={featured.endsAt} /></div><Link href="/products?type=DEAL">View all deals →</Link></div><div className="v21-shell">
    <div className="v21-flash-grid"><article className="v21-flash-feature"><Link href={'/products/' + featured.slug} className="v21-image"><Image src={featured.image!} alt={featured.name} fill sizes="(max-width: 900px) 100vw, 45vw" /></Link><div className="v21-flash-copy"><span>FEATURED DEAL</span><small>{featured.brand ?? featured.category}</small><h3>{featured.name}</h3><Price product={featured} price={featured.flashPrice} /><Stock deal={featured} /><AddButton product={featured} price={featured.flashPrice} /></div></article>
      <div className="v21-flash-support">{deals.slice(1).map((deal) => <article key={deal.dealId}><Link href={'/products/' + deal.slug} className="v21-image"><Image src={deal.image!} alt={deal.name} fill sizes="(max-width: 900px) 44vw, 220px" /><b>-{deal.flashDiscountPercent}%</b></Link><div><small>{deal.brand ?? deal.category}</small><h3>{deal.name}</h3><Price product={deal} price={deal.flashPrice} /><Stock deal={deal} /><AddButton product={deal} price={deal.flashPrice} /></div></article>)}<Link className="v21-bottom-cta inverse" href="/products?type=DEAL">See all Flash Deals →</Link></div>
    </div>
  </div></section>;
}

function BestValue({ products }: { products: HomeProduct[] }) {
  const [selectedId, setSelectedId] = useState(products[0]?.id);
  const selected = products.find((product) => product.id === selectedId) ?? products[0];
  if (!selected) return null;
  return <section className="v21-value"><div className="v21-shell"><header className="v21-value-header"><p>SAVO SAVINGS · وفّر أكثر</p><h2>Best Value.</h2></header><div className="v21-value-layout"><div className="v21-value-feature"><p>YOU SAVE</p><strong key={selected.id}>KD {(selected.originalPrice - selected.price).toFixed(3)}</strong><div><del>{kd(selected.originalPrice)}</del><b>{kd(selected.price)}</b></div><em>-{Math.round((1 - selected.price / selected.originalPrice) * 100)}%</em><h3>{selected.name}</h3>{selected.nameAr && <p dir="rtl">{selected.nameAr}</p>}<Link href={'/products/' + selected.slug}>View Product →</Link></div><div className="v21-value-selector">{products.map((product) => <button type="button" aria-pressed={product.id === selected.id} onClick={() => setSelectedId(product.id)} key={product.id}><span className="v21-image"><Image src={product.image!} alt={product.name} fill sizes="(max-width: 900px) 44vw, 250px" /></span><small>{product.brand ?? product.category}</small><b>{product.name}</b><strong>Save KD {(product.originalPrice - product.price).toFixed(3)}</strong></button>)}</div></div></div></section>;
}

const kd = (value: number) => "KD " + value.toFixed(3);

export function ProductCommerceSections({ justLanded, bestValue, endingSoon }: { justLanded: HomeProduct[]; bestValue: HomeProduct[]; endingSoon: HomeDeal[] }) {
  return <>
    {!!justLanded.length && <section className="v21-just"><div className="v21-shell"><header className="v21-section-head"><div><p>JUST IN · وصل حديثًا</p><h2>Just Landed.</h2></div><Link href="/products?sort=newest">See all →</Link></header><div className="v21-product-grid">{justLanded.map((product) => <article className="v21-product-card" key={product.id}><Link href={'/products/' + product.slug} className="v21-image"><Image src={product.image!} alt={product.name} fill sizes="(max-width: 560px) 44vw, 280px" /><span>NEW</span></Link><div><small>{product.brand ?? product.category}</small><h3>{product.name}</h3>{product.nameAr && <p dir="rtl">{product.nameAr}</p>}<Price product={product} /><AddButton product={product} /></div></article>)}</div></div></section>}
    {!!bestValue.length && <BestValue products={bestValue} />}
    {!!endingSoon.length && <section className="v21-ending"><div className="v21-shell"><header className="v21-ending-header"><div><p><i /> ENDING SOON · ينتهي قريبًا</p><h2>Don&apos;t miss out.</h2></div><div className="v21-ending-clock"><small>TIME REMAINING</small><HomeCountdown endsAt={endingSoon[0].endsAt} segmented labels /></div></header><div className="v21-ending-grid">{endingSoon.map((deal, index) => <article key={deal.dealId}><Link href={'/products/' + deal.slug} className="v21-image"><Image src={deal.image!} alt={deal.name} fill sizes="(max-width: 560px) 44vw, 280px" /><i /><span>{["DON'T MISS IT", "ENDING SOON", "GOING FAST", "LAST CHANCE"][index]}</span><b>-{deal.flashDiscountPercent}%</b></Link><div><small>{deal.brand ?? deal.category}</small><h3>{deal.name}</h3><Price product={deal} price={deal.flashPrice} /><Stock deal={deal} /><AddButton product={deal} price={deal.flashPrice} label="Grab It Now" /></div></article>)}</div><Link className="v21-bottom-cta" href="/products?type=DEAL">See all ending soon →</Link></div></section>}
  </>;
}
