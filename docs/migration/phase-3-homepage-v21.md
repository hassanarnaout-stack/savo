# Phase 3 — Version 21 Homepage on Operational Data

## Scope

Phase 3 replaces only the storefront homepage presentation. The Phase 1 brand system and Phase 2 responsive shell remain canonical. Admin, Supplier, authentication, Prisma, inventory, orders, checkout, payments, commissions, ledgers, wallets, payouts, Mystery Box fulfillment and AI systems were intentionally untouched.

## Visual source

- Version 21 source: `C:\Users\hassa\OneDrive\Documents\ChatGPT\savo-new`
- Operational target: `C:\Users\hassa\Downloads\saveo-live\saveo`
- Section order: Hero, ticker, Flash Deals, Trending Now, Editor's Picks, Shop by Category, Shop by Brand, Mystery Box, Just Landed, Best Value, Ending Soon and Trust.

## Operational adapter

`src/lib/homepage-view-model.ts` is the server-only boundary between operational records and the Version 21 presentation. It serializes public product data and derives section membership without copying static Version 21 catalog data.

The homepage respects existing operational controls at every render:

- Products require `ACTIVE` status and `APPROVED` approval status.
- SAVO Plus visibility uses `MembershipService.getVisibilityFilter`.
- Flash Deals require `LIVE`, `isActive`, a current start/end window and remaining allocated deal stock.
- Ending Soon is the four nearest live deals inside the six-hour operational window.
- Editor's Picks require a current `EDITORS_PICK` product badge.
- Categories require `isActive` and use live public product counts.
- Brand cards are grouped from real `brandName` values and render correctly for one, two, three or four-plus brands.
- Verified-supplier reassurance counts only `ACTIVE` and `VERIFIED` suppliers.
- Prices, stock, imagery, product names, Mystery Box values and routes are serialized from operational records.

No product IDs, product slugs, prices, stock quantities, timers, activation states or fixture selections are hardcoded in the homepage source.

## Commerce behavior

Dedicated Version 21 cards use the existing Zustand cart store, preserve stock caps, open the operational cart drawer and expose the temporary added state. Links use the existing locale-aware routing layer. Favorites, authentication, locale switching, shell cart counts and account state remain owned by the Phase 2 shell and existing APIs.

## Safety-branch fixture changelog

The verified Neon safety branch contains temporary non-production merchandising records used to prove the dynamic integration:

- Six live timed deals, with four currently qualifying for Ending Soon.
- Three current Editor's Pick badges.
- Deal allocations were checked against available stock.

Those records were created before the source migration and were not recreated during this continuation. The homepage does not identify them by name or ID; changing their Admin-controlled status or timing changes the rendered sections dynamically.

## Responsive and accessibility decisions

- Desktop uses the Version 21 asymmetric compositions and 1280px content shell.
- Tablet collapses feature compositions before the mobile breakpoint.
- 390×844 and 360×800 use two-column product/category layouts, the Phase 2 mobile header and bottom navigation, and no page-level horizontal overflow.
- Arabic continues to use the document RTL direction and Cairo for explicitly bilingual content.
- Countdown first render is stable to avoid hydration differences.
- Decorative motion is disabled under `prefers-reduced-motion`.
- Missing operational media uses an explicit neutral unavailable-source surface; products without usable storefront imagery are not promoted into image-led sections.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run build`: passed using only the approved safety-branch connection.
- Browser-tested: 1440×900 English, 390×844 English and 360×800 Arabic.
- Section order and fixture-backed Flash Deals, Editor's Picks and Ending Soon were verified live.
- Cart add/drawer behavior was verified.
- Page-level horizontal overflow: 0px at all tested viewports.
- Homepage images: no broken rendered images after the test cart was cleared.

## Intentionally untouched

Prisma schema and migrations, seed scripts, environment files, Admin and Supplier portals, auth/session implementation, operational APIs, product/catalog ownership, inventory, orders, checkout, payment processing, commissions/payables, ledger/wallet/payout systems, recommendation internals, Header, Footer and mobile shell.
