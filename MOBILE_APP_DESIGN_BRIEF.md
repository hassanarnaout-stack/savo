# Savo Mobile App — Design Brief for Claude Design

This is a handoff for designing the Savo mobile app. Everything below reflects what's actually built (real API, real design system already live on web) - not a wishlist. Use it as grounding, not a rigid spec.

---

## 0. Official Tagline

**"Savo — Your World of Discovery."** / **"Saveo — عالمك للاكتشاف."**

This is the real brand slogan and should appear on the login/splash screen and anywhere else a tagline is shown. Do not substitute a generic descriptive line (e.g. "everything you need from multiple suppliers in one place") in its place.

---

## 1. What Savo Is

A multi-supplier e-commerce marketplace for Kuwait. Web platform is fully built (Next.js). This brief is for designing the companion mobile app, which will consume the already-built Mobile API (`docs/MOBILE_API.md` in the project files).

---

## 2. Design System — "Saveo Aura"

**Colors — strictly limited to these two families, nothing else:**
- Emerald (primary): `#0B3D2E` - hero surfaces, header, footer, primary buttons
- Gold (accent): `#D4AF37` - badges, CTAs, highlights, premium/VIP indicators
- Supporting neutrals: white, soft white, light gray, and black used sparingly

Do not introduce other hues (no red/blue/purple/etc.) for brand/marketing surfaces. Functional exceptions only: error states, destructive actions, and financial debit indicators may use standard red - that's a UX convention, not a brand color.

**Visual language:**
- Luxury, minimal, elegant - feels like a premium boutique, not a discount app
- Soft multi-layer shadows (not flat drop-shadows) - depth should feel real, not sticker-like
- Calm, spring-based motion - no bouncy/exaggerated animation
- A signature "Aura" glow effect (soft light sweep / cursor-reactive glow on web) - reserved for hero moments and premium content, not applied everywhere
- Rounded corners throughout (generous radius - nothing sharp-edged)
- Arabic (RTL) and English (LTR) are both first-class - every screen needs to work mirrored

**Typography:** clean, modern sans-serif; Arabic uses a proper Arabic-optimized typeface (IBM Plex Sans Arabic is used on web), not a Latin font stretched to fit Arabic.

---

## 3. Screen Map — Priority Order

### Tier 1 — Launch Mode screens (build these first; these are what's actually live at launch)
- Onboarding / Login / Register
- Home (category rails, active deals, search entry)
- Category browse
- Search + filters
- Product detail (images, price, stock, add to cart)
- Cart
- Checkout (address, COD payment - see note below)
- Order confirmation
- Order history / Order detail (with live delivery tracking - driver name, ETA, OTP code shown to customer)
- Account (profile, addresses, order history entry point)
- Wishlist/Favorites

### Tier 2 — currently OFF at launch, but real and fully built server-side (design these as a fast-follow, gated behind feature flags the same way the web app is)
- AI Shopping Assistant (chat-style product search, bilingual)
- Personalized "Recommended For You" home section
- Mystery Boxes (browse tiers, purchase, reveal-the-box animation moment)
- Savo Plus membership (join flow, member dashboard, exclusive badge)
- Gamified campaigns: Treasure Chest, Golden Ticket, Treasure Map, Limited-Time Hunt, Mystery Safe - each is a distinct reveal-moment screen
- Deal of the Hour (countdown hero card)
- Frequently Bought Together / Smart Cross-Selling on product detail

### Also real and available (not gated, always relevant)
- Brand Districts (browse by real manufacturer brand, e.g. "Lindt" - never shows which supplier fulfills the order)
- Collections (curated product groupings)
- Discover hub (aggregates trending/new/deals)
- Internal messaging (customer support thread with admin)
- Gift cards (purchase + balance check)
- Affiliate dashboard (referral link, earnings, milestones) - if the app targets affiliates too

---

## 4. Payment Note (Important for Checkout Screens)

Only Cash on Delivery (COD) is live today. Design the checkout flow to support COD as the real, functioning path, but leave clear visual slots for card/KNET payment methods to slot in later (they're architecturally ready server-side, just not connected to a live gateway yet) - don't hardcode the UI as COD-only in a way that can't extend.

---

## 5. Real API Surface Available Today

Base: `/api/mobile/v1` - full details in `docs/MOBILE_API.md`. Summary:
- Auth: login, refresh (rotating tokens), logout
- Catalog: paginated product listing
- Deep links: resolves `saveo://open?path=...` to a screen
- Orders: order history
- Wishlist: synced with web (same underlying data)
- Cart sync: cross-device cart (separate from web's local-only cart)
- Push tokens: registration endpoint exists; actual push delivery (FCM/APNs) is not yet connected - design push-triggered screens, but know they won't fire in a demo yet

---

## 6. What NOT to Design (Honest Gaps)

- No real file/photo upload flow exists server-side yet - any "upload a photo" moment (e.g. delivery proof, review photos) should design for a URL-paste fallback, not assume a native camera-roll picker wired to a working upload endpoint
- No live chat/WebSocket - messaging and delivery tracking are near-real-time via polling (a few seconds of lag is expected and fine to design around, no need for an "instant" typing-indicator feel)
- No driver-facing app/account exists - do not design a driver login or driver app screens as part of this scope
