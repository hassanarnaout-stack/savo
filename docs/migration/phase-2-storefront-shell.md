# Phase 2 — Version 21 storefront shell

## Visual source inspected

- `savo-new/src/components/layout/SavoHeader.tsx`
- `savo-new/src/components/layout/SavoFooter.tsx`
- `savo-new/src/components/layout/MobileBottomNav.tsx`
- `savo-new/src/components/layout/StoreShell.tsx`
- `savo-new/src/components/layout/SavoLogo.tsx`
- Version 21 shell and responsive rules in `savo-new/src/app/globals.css`

## Operational source inspected

- Locale-aware header, footer, mobile drawer and navigation
- `next-intl` routing and English/Arabic direction handling
- Prisma-driven featured categories
- authenticated account and SAVO Plus presentation
- persisted Zustand cart state and cart drawer behavior
- real customer routes and supported product filters

## Target changes

- Rebuilt the desktop and mobile header presentation on Version 21 Ink and Ink Mid surfaces.
- Retained operational search submission, locale switching, favorites, account, SAVO Plus and cart behavior.
- Added Version 21 desktop primary navigation and deals menu using only supported operational destinations.
- Rebuilt the mobile drawer with operational categories, locale-aware copy, scroll locking, Escape handling, focus trapping and focus restoration.
- Added the Version 21 mobile bottom navigation with locale-aware labels, active states, safe-area padding and the hydrated operational cart count.
- Rebuilt the footer using Version 21 layout, spacing, typography and surfaces while retaining only verified operational links and contact information.
- Wrapped customer content in the Version 21 mobile scroll-shell structure so the header and bottom navigation remain outside the page scroll owner.

## Official logo and Fire dot

All shell placements render the approved outlined SVGs from `public/brand/official/02-svg`. The master files are not modified. A presentation-layer overlay uses the official SVG dot coordinates and scales proportionally with each logo size. Only the Fire dot receives the subtle two-second pulse/glow; `prefers-reduced-motion: reduce` keeps it static.

## Responsive and RTL decisions

- Desktop shell follows the Version 21 1280px content width and 40px outer header/footer spacing.
- At 900px and below, the desktop search/navigation collapse into the 54px mobile header, drawer and five-item bottom navigation.
- Drawer placement, spacing and badge positions use logical inline properties so they mirror under Arabic RTL.
- English uses Manrope for shell UI; Arabic copy uses the existing locale direction and Cairo where source-specific Arabic typography is required.

## Files intentionally untouched

No Homepage section, product card, PDP, Categories page, Brands page, cart page, checkout page, account page, Admin or Supplier component was migrated. Prisma, schema, database services, authentication architecture, API routes, inventory, reservations, orders, commissions, ledgers, wallets, payouts, payments, Mystery Box fulfillment and AI systems remain unchanged.

## Files removed

None. Existing shell component paths were retained and updated in place.
