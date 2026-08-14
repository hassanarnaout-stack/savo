# Phase 3.5 — Strict Version 21 Visual Fidelity

Version 21 remains the final visual source of truth. Operational SAVO remains the data, state, routing and commerce source of truth.

## Audit method

- Compared the final source in `C:\Users\hassa\OneDrive\Documents\ChatGPT\savo-new` with the operational migration in `C:\Users\hassa\Downloads\saveo-live\saveo`.
- Audited source components, exact CSS values and rendered desktop geometry at 1440×900.
- Audited Header, responsive shell, drawer, bottom navigation and Footer against the already migrated Phase 2 implementation.
- Preserved the existing server adapter and all Admin-controlled activation rules.

## Deviations found and corrected

### Hero and ticker

- Restored the source 72px/60px hero padding, 1280px maximum width, equal desktop columns, 64px gap, 66px display heading, 19px Arabic line and 310px floating cards.
- Restored the ticker's 10px vertical padding, 13px text and 40px message spacing while retaining its 24-second loop.

### Flash Deals

- Restored the Fire gradient live-event bar, event dot, timer and right-side event CTA.
- Restored the 1.1/.9 desktop composition, image-led featured deal, vertical supporting cards and full-width right-column CTA.
- The CTA was moved from below the entire section into the supporting column, matching V21.

### Trending and Editor's Picks

- Restored the 616px asymmetric Trending composition, 300px rows, source card surfaces and featured-card overlay hierarchy.
- Restored 46px section headings.
- Restored the .9/1.1 Editor's Picks grid, 480px feature, 24px gap, 24px radius, white feature badge and source CTA proportions.

### Category and Brand

- Corrected Shop by Category from an Ink surface to the V21 Surface background.
- Restored 300px category worlds, 16px gaps, 22px headings and source overlay opacity.
- Corrected Shop by Brand from Ink Mid to Ink and restored 80px/60px section padding, 32px card padding, 26px headings and decorative-circle geometry.

### Mystery Box

- Restored 96px section padding, 760px content width, 120px box artwork, 64px heading, blurred/low-opacity decorative product hints, source value panel and CTA sizing.

### Just Landed

- Replaced the generic four-column grid with the V21 horizontal shelf.
- Restored 260px cards, 220px images, 20px gaps, Surface cards and edge-peeking mobile behavior.

### Best Value / SAVO Savings

- Replaced the generic four-card grid with the source two-column savings composition.
- Restored the large 80px savings value, selected product copy, Teal product CTA and interactive 2×2 selector.
- Selector changes are presentation-only; prices and savings remain derived from operational product records.

### Ending Soon and Trust

- Restored the dark Fire/Ink gradient, bilingual Fire pill, labeled HRS/MIN/SEC countdown, dark cards, Fire stock treatment and centered outlined CTA.
- Restored independent Trust cards with source gaps, borders, radii, Ink/Ink Mid surfaces and 38px heading.

## Shell audit

- Desktop Header, mobile Header, drawer, bottom navigation, Footer, official logo and animated Fire dot remain the Phase 2 canonical shell.
- Operational search, authentication, favorites, cart count, locale switching, routes and RTL ownership remain intact.
- No shell source was changed during Phase 3.5.

## Intentional operational differences

- Product names, images, prices, savings, stock and countdowns come from operational records rather than V21 demo data.
- Three real brands produce three V21 cards; no fourth brand is fabricated. This makes the operational section shorter than the four-card reference.
- Category cards omit demo-only subcategory chips when authoritative chip relationships are unavailable.
- Mystery Box product hints and value range use visible operational boxes. Membership visibility can reduce the number of visible hints.
- Trust and ticker copy use truthful operational claims instead of unverified static payment or delivery claims.
- Sections with no qualifying authoritative records remain hidden, while retaining their V21 component treatment when records become active.

## Desktop comparison

At 1440×900 after correction:

- Hero: operational 526.9px; V21 532.6px.
- Flash Deals: operational 552.2px; V21 535.5px. Difference comes from live dynamic copy and timer bar line box.
- Trending: operational 854.5px; V21 857.3px.
- Category: both 554.5px.
- Mystery Box: operational 863.3px; V21 893.9px due to the intentionally omitted demo-only Arabic description line.
- Ending Soon: operational 791.8px; V21 786.4px.
- No horizontal overflow at desktop.

## Responsive and RTL validation

- Responsive rules now reproduce the V21 900px and 460px transitions: two-column visual worlds and product cards, horizontal Just Landed shelf, stacked savings composition, two-column Ending Soon and Trust grids, and mobile typography reductions.
- Arabic continues to use document-level RTL and Cairo for bilingual/Arabic content.
- Exact mobile viewport overrides became unavailable during the final Phase 3.5 browser run and remained at desktop width. No claim of a new pixel-rendered 390×844 or 360×800 pass is made. The same shell and base homepage had previously passed those exact viewports in Phase 3 before these CSS-only responsive mappings; Phase 3.5 additionally uses the approved V21 mobile values directly.

## Protected functionality

No changes were made to Prisma, migrations, database records, authentication, Admin, Supplier, APIs, inventory, orders, checkout, payments, commissions, ledgers, wallets, payouts, Mystery Box fulfillment or AI systems. No demo catalog data was introduced.
