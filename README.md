# Saveo — Smart Savings Platform (Kuwait)

**Save More. Discover More.**

A production-grade e-commerce platform built with Next.js 15 (App Router), TypeScript, Tailwind CSS, PostgreSQL, Prisma, and Auth.js. Built for Saveo's Phase 1 owned-inventory model, with the data model already prepared for Phase 2's multi-merchant marketplace.

---

## 1. Tech Stack

| Layer          | Choice                                   |
|----------------|-------------------------------------------|
| Framework      | Next.js 15 (App Router, Server Components) |
| Language       | TypeScript (strict)                       |
| Styling        | Tailwind CSS (custom Saveo design tokens) |
| Database       | PostgreSQL                                |
| ORM            | Prisma                                    |
| Auth           | Auth.js v5 (credentials provider, JWT sessions) |
| State          | Zustand (client cart), Server Components (everything else) |
| Charts         | Recharts (admin dashboard)                |

---

## 2. Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env with your PostgreSQL connection string and AUTH_SECRET
# generate a secret with: openssl rand -base64 32

# 3. Push the schema to your database
npm run db:push

# 4. Seed sample data (categories, products, demo accounts)
npm run db:seed

# 5. Run the dev server
npm run dev
```

Visit `http://localhost:3000`.

**Seeded accounts:**
- Admin: `admin@saveo.com.kw` / `Admin1234!` → `/admin`
- Customer: `customer@example.com` / `Customer1234!`

---

## 3. Folder Structure

```
src/
  app/                        # Next.js App Router routes
    page.tsx                  # Homepage
    products/                 # Listing + [slug] detail page
    category/[slug]/          # Dynamic category pages (data-driven)
    cart/, checkout/          # Cart & checkout flow
    account/, favorites/      # Customer account area
    login/, register/         # Auth pages
    admin/                    # Admin dashboard (guarded layout)
      page.tsx                # Sales overview, revenue, best sellers
      products/                # Product CRUD
      orders/                  # Order management + status updates
      categories/              # Dynamic category management
    api/                      # Route handlers (checkout, admin CRUD, auth, favorites)
  components/
    layout/                   # Header, footer, mobile nav
    product/                  # ProductCard, PriceTag, CountdownTimer, recommendation rails
    cart/                     # Cart drawer/button ("Complete your deal")
    order/                    # Status badges shared by customer + admin views
    admin/                    # Dashboard charts, product form, order status updater, category manager
  lib/
    prisma.ts                 # Prisma client singleton
    auth.ts                   # Auth.js config + requireAdmin() guard
    utils.ts                  # Pricing/discount math, formatting, countdown helpers
    recommendations.ts        # Cross-sell / upsell / FBT / related / complete-your-deal engine
  store/
    cart-store.ts             # Zustand cart (persisted client-side)
prisma/
  schema.prisma                # Full data model
  seed.ts                       # Sample categories, products, and curated relations
```

---

## 4. Architecture Notes — Built for Marketplace Expansion

The brief calls for owned inventory today, marketplace tomorrow. Key decisions that make that transition non-breaking:

1. **`Merchant` model already exists.** Every `Product` has an optional `merchantId`. Today, every product points to one internal `Merchant` record (`isInternal: true`, "Saveo Warehouse"). Phase 2 onboarding just means creating additional `Merchant` records with real `ownerUserId`s — no schema change, no data migration of existing products.
2. **`UserRole` already includes `MERCHANT`.** The role enum is ready for merchant-owner logins; only new routes/dashboards need to be added.
3. **Categories are 100% data-driven.** There is no hard-coded category list anywhere in the codebase — not in navigation, filters, or homepage tiles. Everything reads from the `Category` table (self-referencing for subcategories), which the admin can manage at `/admin/categories`. Adding "Home", "Cleaning", "Kitchen", or "Fashion" requires zero code changes.
4. **`ProductAttribute` is a flexible key/value table** for facets that vary by category (e.g. "Weight", "Origin", "Material") without needing new columns per product type.
5. **`commission` field on `Merchant`** is already present (nullable) for when Saveo needs to take a marketplace cut.

---

## 5. Sales Optimization Engine

All recommendation surfaces route through `src/lib/recommendations.ts` and the `ProductRelation` table (`RELATED`, `CROSS_SELL`, `UPSELL`, `FREQUENTLY_BOUGHT_TOGETHER`, `COMPLETE_YOUR_DEAL`):

- **Cross-sell** (PDP): e.g. chocolate → juice, snacks, kids' party items.
- **Upsell** (PDP): e.g. single bar → gift box.
- **Frequently Bought Together** (PDP): a selectable bundle with live total price.
- **Related Products** (PDP): "you may also like" rail.
- **Complete Your Deal** (Cart drawer): looks at everything in the cart and surfaces curated companion items.

If no curated relation exists yet for a product, each function **falls back to same-category best sellers**, so the storefront never shows an empty rail — but the admin can (and should) curate real relations for the strongest merchandising results. Curating relations currently happens via the seed script / Prisma Studio; a dedicated "related products" UI panel is a natural next addition to the product edit form.

---

## 6. Product Model Coverage

Every requirement from the brief maps directly to `Product` fields:

| Requirement                  | Field(s) |
|-------------------------------|----------|
| Name / Description / Images   | `name`, `description`, `ProductImage[]` |
| Category                      | `categoryId` → `Category` |
| Original / Saveo price        | `originalPrice`, `saveoPrice` |
| Discount %                    | Derived via `calcDiscountPct()`, cached in `discountPct` |
| Stock quantity                | `stockQty`, with `lowStockAlert` threshold |
| Limited-time deal countdown   | `dealStartsAt`, `dealEndsAt` → `<CountdownTimer />` |
| Expiry date (optional)        | `expiryDate` |
| Related products               | `ProductRelation` (see §5) |

---

## 7. Admin Dashboard

- **Dashboard** (`/admin`): 30-day revenue trend chart, order count, average order value, low-stock alerts, best sellers, recent orders.
- **Products** (`/admin/products`): searchable table, create/edit form with live discount calculation, deal countdown picker, expiry date, mystery box fields.
- **Orders** (`/admin/orders`): filterable by status; detail page lets admins move an order through `Pending → Confirmed → Preparing → Delivered` or `Cancelled`, with a full status history log.
- **Categories** (`/admin/categories`): add new categories on the fly, toggle homepage-featured status.

All admin routes are protected by `requireAdmin()` (server-side) and the `/admin` layout redirect (page-level), checking `role === 'ADMIN' | 'SUPER_ADMIN'`.

---

## 8. What's Stubbed / Next Steps

This is a complete, coherent MVP codebase, not a fully deployed production system. Before going live:

- **Image uploads**: product forms currently accept an image URL; wire up UploadThing (already in `package.json`) or S3 for real admin image uploads.
- **Payments**: checkout captures a payment *method* (KNET/Card/COD) but does not integrate a live payment gateway (e.g. MyFatoorah, Tap, or a KNET aggregator) — required before real transactions.
- **Email/SMS notifications**: order confirmation and status-change notifications are not yet wired up.
- **Reviews UI**: `Review` model exists in the schema; a submission/display UI is not yet built.
- **Related-products curation UI**: currently managed via seed data / Prisma Studio; an in-admin picker on the product edit page would streamline merchandising.
- **Rate limiting & input hardening** on public API routes before production traffic.
- **Testing**: no automated test suite yet (recommend Vitest + Playwright).

---

## 9. Design System

- **Green** (`saveo.green.500` `#0FA968`) — the savings identity, used for prices, CTAs, and success states.
- **Black** (`saveo.black` `#0B0C0E`) — premium accent, used for the header top strip, hero, and primary buttons.
- **Cream/White** (`saveo.cream` `#FAFAF8`) — clean background.
- **Signature element**: the `.savings-tag` component — a torn-ticket-style discount badge (visual nod to a coupon stub) used consistently across product cards, PDP, and hero.
