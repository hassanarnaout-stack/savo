"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingCart, Gift } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { PriceTag } from "@/components/product/price-tag";
import { CountdownTimer } from "@/components/product/countdown-timer";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";

export interface ProductCardData {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  originalPrice: number | string;
  saveoPrice: number | string;
  stockQty: number;
  type: "STANDARD" | "DEAL" | "MYSTERY_BOX" | "RESCUE";
  dealEndsAt: string | Date | null;
  images: { url: string; altText: string | null }[];
  discoveryScore?: number | null;
  avgRating?: number | null;
  orderCount?: number | null;
  isFavorited?: boolean;
}

/**
 * Design Language v1, batch 1 — Luxury Product Card.
 * Real depth (multi-layer shadow + calm float-on-hover, no scale-pop),
 * quick-action wishlist wired to the real /api/favorites endpoint
 * (previously a dead button — preventDefault() with no request behind
 * it), and a subtle reflection sweep on the image only, not the whole
 * card, so it reads as a product photograph catching light rather than
 * a gimmick.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const addItem = useCartStore((s) => s.addItem);
  const locale = useLocale();
  const p = useTranslations("product");
  const common = useTranslations("common");
  const image = product.images[0]?.url ?? "/placeholder-product.png";
  const outOfStock = product.stockQty <= 0;
  const displayName = locale === "ar" && product.nameAr ? product.nameAr : product.name;

  const [favorited, setFavorited] = useState(!!product.isFavorited);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image,
        originalPrice: Number(product.originalPrice),
        saveoPrice: Number(product.saveoPrice),
        stockQty: product.stockQty,
      },
      1
    );
    toast.success(`${displayName} added to cart`);
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    const optimistic = !favorited;
    setFavorited(optimistic); // optimistic update — reverted below if the request actually fails
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFavorited(data.favorited);
    } catch {
      setFavorited(!optimistic);
      toast.error("Please sign in to save favorites");
    } finally {
      setFavoriteBusy(false);
    }
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card-float shadow-luxury hover:shadow-luxury-hover group flex flex-col overflow-hidden rounded-xl2 bg-white"
    >
      <div className="relative aspect-square overflow-hidden bg-saveo-emerald-700/[0.03]">
        <Image
          src={image}
          alt={displayName}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {/* Soft reflection sweep on the image itself, not the whole card — reads as light catching a photograph. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
          }}
        />

        {product.type === "MYSTERY_BOX" && (
          <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-saveo-emerald-700/90 px-2 py-1 text-[10px] font-bold text-white">
            <Gift className="h-3 w-3" /> MYSTERY
          </span>
        )}
        {typeof product.discoveryScore === "number" && product.discoveryScore >= 70 && (
          <span className="absolute start-2 bottom-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
            💎 {product.discoveryScore}
          </span>
        )}

        <button
          onClick={handleToggleFavorite}
          disabled={favoriteBusy}
          className="shadow-luxury absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 transition-transform duration-300 hover:scale-110"
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-4 w-4 transition-colors ${favorited ? "fill-saveo-gold-400 text-saveo-gold-400" : "text-saveo-emerald-700"}`} />
        </button>

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-saveo-emerald-700 px-3 py-1 text-xs font-bold text-white">
              {common("outOfStock")}
            </span>
          </div>
        )}
        {!outOfStock && Number(product.originalPrice) > Number(product.saveoPrice) && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/75 p-2.5 text-white opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <p className="text-xs">
              <span className="line-through opacity-60">{Number(product.originalPrice).toFixed(3)} KD</span>{" "}
              <span className="font-bold text-saveo-gold-400">
                Save {Math.round((1 - Number(product.saveoPrice) / Number(product.originalPrice)) * 100)}%
              </span>
            </p>
            {(typeof product.avgRating === "number" || typeof product.orderCount === "number") && (
              <p className="mt-0.5 flex items-center gap-2 text-[11px] opacity-80">
                {typeof product.avgRating === "number" && product.avgRating > 0 && <span>⭐ {product.avgRating.toFixed(1)}</span>}
                {typeof product.orderCount === "number" && product.orderCount > 0 && <span>{product.orderCount} bought</span>}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {product.dealEndsAt && <CountdownTimer dealEndsAt={product.dealEndsAt} compact />}
        <h3 className="line-clamp-2 text-sm font-semibold text-saveo-emerald-700">{displayName}</h3>
        <PriceTag
          originalPrice={Number(product.originalPrice)}
          saveoPrice={Number(product.saveoPrice)}
        />
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="btn-primary mt-auto w-full !py-2.5 text-sm transition-transform duration-200 active:scale-[0.98] disabled:bg-saveo-emerald-700/20"
        >
          <ShoppingCart className="h-4 w-4" />
          {outOfStock ? common("outOfStock") : p("addToCart")}
        </button>
      </div>
    </Link>
  );
}
