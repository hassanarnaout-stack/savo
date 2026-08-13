# Savo — Developer Handoff

This document exists because Savo grew from a simple e-commerce app into a very large platform, one conversation at a time, with a lot of deliberate architectural decisions and honestly-documented gaps along the way. Reading this first will save you days of rediscovering things the hard way. For basic setup (install, env vars, dev server), see `README.md` — this document is about *why things are built the way they are*, not *how to run them*.

---

## 1. Scope Overview

Savo is a multi-supplier e-commerce marketplace for Kuwait. Beyond the core storefront/checkout, it includes:

- **Product Experience Studio**: 360° viewer, video commerce, ingredient/nutrition data, dynamic badges, story mode, AR-ready 3D viewer (via Google's real `<model-viewer>`), flavor profiles, smart comparison
- **Discovery**: Category "Worlds" (themed category pages), Brand Districts (`brandName`-based, not supplier-based), Collections (admin-curated product groupings), a unified `/discover` hub, AI Shopping Assistant (real pattern-based NLU, not an LLM)
- **Commerce systems**: Mystery Boxes, Flash Deals/Deal of the Hour, Bundles, Gift Cards (purchase + system-issued rewards), Subscribe & Save (admin opt-in per product), Sponsored Products, Affiliate Program (referrals, commissions, tiered milestone rewards)
- **Operations**: Warehouse/inventory management, supplier payouts, delivery tracking with OTP confirmation, internal messaging (customer/supplier - admin)
- **Admin**: BI dashboards, pricing intelligence, supplier performance scoring, feature flags, an internal AI assistant (also pattern-based, not a connected LLM)
- **Design system**: "Saveo Aura" luxury visual language - Emerald (#0B3D2E) + Gold (#D4AF37) only, real depth/shadow/float CSS system, no other colors

Prisma schema is large (100+ models). `prisma/seed.ts` has real demo data across most systems - read it before writing your own seed data, since it shows working patterns for every major feature.

---

## 2. Decisions You Need to Know Before Touching the Code

These aren't obvious from reading a single file - they're cross-cutting rules enforced in many places. Breaking them silently will reintroduce bugs that were deliberately fixed.

### 2.1 Supplier identity is never shown to customers - Brand identity is different and IS shown
Customers never see which supplier fulfills an order - no supplier storefront page (`/suppliers/[slug]` is intentionally `notFound()`), no supplier name on product cards, order confirmations, or AI assistant output. This was a deliberate product decision, documented in the supplier page's own code comment.

`brandName` (a plain string field on `Product`, e.g. "Lindt", "KitKat") is the opposite - it's the real manufacturer brand and is meant to be customer-facing. Brand Districts (`/brands/[slug]`) are built on this field. Never confuse the two. If you're building anything that queries `Supplier`, double-check it isn't leaking into a customer-facing `select`/response.

### 2.2 No LLM is connected anywhere in this codebase
The AI Shopping Assistant, the admin AI Assistant, and any other "AI" feature are real pattern/keyword/rule-based systems - regex price extraction, bilingual keyword dictionaries, badge-threshold logic, etc. This was a deliberate, consistently-applied honesty constraint throughout the build (see `src/lib/services/shopping-assistant-service.ts` and `src/lib/services/ai-commerce-assistant-service.ts`). If you want to wire in a real LLM later, that's a genuine architecture change, not a toggle.

### 2.3 "Real-time" features are polling, not WebSockets
Internal Messaging and Live Delivery Tracking both poll every few seconds (`setInterval` + `fetch`) rather than using a WebSocket/Pusher connection - no such infrastructure exists in this project. This is documented in-code at each usage site. If you add true push-based real-time, update both.

### 2.4 Drivers have no real user accounts
`DeliveryDriver` has no linked `User` - no login, no session. Driver location updates and delivery status changes currently go through admin-facing endpoints (e.g. `/api/admin/delivery-drivers/[id]/ping`), not a driver-facing app. This blocks any real "Driver <-> Customer messaging" or driver self-service feature until driver auth is built as its own project.

### 2.5 No real payment gateway is wired up
`PaymentService.initiatePayment()` handles COD as a real, live path. KNET/CARD/etc. are registered provider slots that honestly report "not yet connected" rather than pretending to charge the customer. Checkout doesn't block on this - see the comment in `src/app/api/checkout/route.ts`.

### 2.6 No real file upload pipeline exists
Every "media" field across the entire platform (product images, 360° frames, message attachments, review photos, delivery proof) is a URL text input, not a real upload widget - `UPLOADTHING_*` env vars exist as placeholders but aren't wired to any actual upload flow. Follow this same convention for any new media field rather than building a one-off uploader.

### 2.7 Commission/reward math confirms on delivery, not on order placement
Affiliate commissions and supplier payouts both follow "confirm on DELIVERED, void on CANCELLED" - never at checkout time. This pattern is intentional and repeated across `AffiliateService`, supplier settlement logic, etc. Follow it for any new commission-like feature.

### 2.8 The "World" / Discovery Worlds template
`src/lib/world-themes.ts` (`WORLD_THEMES`) maps a category slug to a visual theme. Any category with an entry gets a themed hero + curated sections (best sellers, mystery boxes, real brand groupings) on its existing `/category/[slug]` page - every other category is untouched. To add a new World, add one object to that file; don't duplicate the page logic.

### 2.9 Multi-level affiliate structure exists but isn't active
`AffiliateAccount.referredByAffiliateId` lets one affiliate recruit another, but there is no second-tier commission calculation today. It's real schema, not yet real business logic - don't assume it works end-to-end.

### 2.10 Gift cards serve two purposes on one model
`GiftCardService.purchase()` is a customer purchase (5-200 KD limit). `GiftCardService.issueRewardCard()` is a system-issued reward (e.g. affiliate milestones) with no purchase constraints, reusing the same underlying `GiftCard` table. Don't build a second rewards-currency system - extend this one.

---

## 3. Known Gaps (Honestly Incomplete, Not Faked)

- PDF export / report generation - not implemented anywhere
- Real geolocation / "Nearby" discovery - not implemented
- Recipe-based discovery, Occasion/Lifestyle/Seasonal browsing - not implemented
- Brand Districts have no Video/History/News/Events/Games/Challenges/Rewards content - only real Hero + real product listing exist today
- Push notifications (mobile) are registered but not delivered - missing FCM/APNs credentials, documented honestly at the call site
- True offline/delta sync for the mobile API is a documented gap, not built

If you're picking up a feature and it feels like "surely this exists already," search the codebase for a comment before building it twice - almost every gap above is explicitly commented where it would otherwise be expected.

---

## 4. Where to Look First

- `prisma/schema.prisma` - read the comments above each model block; most non-obvious design decisions are explained inline, right where they matter
- `prisma/seed.ts` - working example data for nearly every system; the closest thing to living documentation for "how do these models relate in practice"
- `src/lib/services/` - ~68 service classes, one responsibility each; if a feature exists, its core logic is almost certainly here, not scattered across API routes
- `src/lib/world-themes.ts`, `src/lib/brand-slug.ts` - small, self-contained, well-commented; good examples of the "real logic, honestly scoped" style used throughout

---

## 5. A Note on Style

Throughout this build, the working principle was: real logic over convincing-looking placeholders. Every "AI" feature, every automation, every real-time indicator either does the real thing or is honestly labeled as not yet connected - nothing here fakes functionality to look more finished than it is. If you extend this platform, the codebase will be easier to work with if you keep that convention rather than papering over a gap with a hardcoded value or fake success state.
