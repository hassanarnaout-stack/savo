# Phase 4 — V21 Product Experience

## Scope

This phase ports the approved Version 21 product-card and product-detail presentation into the operational SAVO application.

## Visual source

- `savo-new/src/components/commerce/ProductCard.tsx`
- `savo-new/src/components/product/ProductGallery.tsx`
- `savo-new/src/components/product/ProductPurchasePanel.tsx`
- `savo-new/src/app/products/[slug]/page.tsx`
- the related V21 rules in `savo-new/src/app/globals.css`

## Operational behavior preserved

- Prisma-backed product, inventory, pricing, expiry, review, media, and category data
- approval and members-only visibility checks
- cart quantity and sponsored-product tracking
- favorites API behavior on reusable product cards
- mystery-box analytics and reveal data
- flash deals, subscriptions, live product signals, bundles, recommendations, comparison, reviews, 360 media, video, AR, ingredients, nutrition, and story modules
- English/Arabic locale routing and RTL content

## Presentation migrated

- V21 product-card surface, media height, badges, favorite control, pricing, stock bar, CTA, hover, and reduced-motion behavior
- V21 PDP breadcrumb strip and balanced two-column desktop composition
- V21 sticky 500px gallery, thumbnail strip, surface, border, and radius treatment
- V21 metadata chips, title/Arabic-title hierarchy, price panel, description rhythm, quantity selector, cart CTA, and wishlist control
- V21 tablet/mobile gallery and purchase-panel proportions

## Intentionally untouched

Prisma schema and migrations, database records, authentication, Admin, Supplier, checkout, orders, inventory, commissions, payouts, APIs, and homepage presentation were not changed.
