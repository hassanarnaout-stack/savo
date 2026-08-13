# Saveo Intelligence Data Access Layer

**Additive-only, read-only.** Sits between (Data Warehouse + Intelligence Core + Application Data) and any future consumer — specifically Phase 4's AI Context Builder. Nothing in this directory modifies Checkout, Orders, Payments, Membership, Inventory, Supplier Logic, the Intelligence Core, or the Data Warehouse. Nothing here is imported anywhere else in the platform today.

## Architecture

```
Application Data → Intelligence Core → Data Warehouse → THIS LAYER → Phase 4 (future)
```

```
intelligence-access/
├── types.ts                              All 13 data contracts (allowlists)
├── security.ts                           assertOwnership(), scanForForbiddenFields()
├── access-cache.ts                       Public-data-only cache
├── customer-access.ts                    getCustomerIntelligence, getCustomerOrderHistory
├── wallet-loyalty-membership-access.ts   getWalletData, getLoyaltyData, getMembershipData
├── cart-access.ts                        getCartIntelligence (explicitly read-only)
├── product-access.ts                     getProductIntelligence, searchRelevantProducts
├── brand-category-access.ts              getBrandIntelligence, getCategoryIntelligence
├── promotion-access.ts                   getActivePromotions
├── recommendation-access.ts              getRelevantRecommendations
└── index.ts                              Single import point
```

## Security Boundary — how it's actually enforced, not just documented

**Every customer-scoped function takes both `customerId` and `requestingUserId` and calls `assertOwnership()` first.** If they don't match, it throws `AccessDeniedError` before touching any data.

```typescript
// Throws AccessDeniedError — customerB can never see customerA's wallet:
await getWalletData(customerA_id, customerB_id);

// Works — a customer reading their own data:
await getWalletData(customerA_id, customerA_id);
```

**No admin bypass exists in this layer on purpose.** Admin tooling already has its own, separately-authorized read paths (`requireAdmin()`). This layer's only job is "can customer X read customer Y's data" — the honest answer is never yes, for anyone.

### Type-level enforcement (structural, not just runtime)

Every type in `types.ts` is a strict allowlist — `commission`/`netPayable`/`supplierId` simply don't exist on `BrandIntelligenceData` or `ProductIntelligenceData`. `security.ts` also exports `scanForForbiddenFields()` — a real automated recursive scanner checking any returned object's keys against a forbidden list.

## Cache scope — structurally restricted to public data

`access-cache.ts` only accepts `PRODUCT_DATA | PROMOTION_DATA | BRAND_INTELLIGENCE | CATEGORY_INTELLIGENCE` as valid sources — the type itself makes it impossible to accidentally cache Customer/Wallet/Cart/Loyalty/Membership data. Those are always read live.

## Never reimplemented — always read

| This layer reads | From |
|---|---|
| Customer score, purchase frequency, favorites | `getCustomerSummary()` — Data Warehouse |
| Product demand/return-rate/rating | `getProductSummary()` — Data Warehouse |
| Brand score, customer count | `getBrandSummary()` — Data Warehouse |
| Category score, growth trend | `getCategorySummary()` — Data Warehouse |
| Product recommendations | `RecommendationService.getRecommendedForUser()` — untouched |

If a warehouse summary doesn't exist yet, the function returns `null` or falls back to one minimal real query — never invented numbers.

## Reused, not reinvented — real business constants

- Free delivery threshold (15 KD) and fee (1.5 KD) in `cart-access.ts` copied verbatim from `checkout/route.ts`.
- Membership benefits read from the real `MembershipBenefitKey` enum (`FREE_DELIVERY`, `EXTRA_DISCOUNT`) — not guessed.

## Query limits — nothing unbounded

`searchRelevantProducts` (max 20), `getCustomerOrderHistory` (max 50), `getActivePromotions` (max 20), `getRelevantRecommendations` (max 20).

## Out of scope for this phase

Zero AI model calls, zero chat UI, zero LLM intent detection. Data access only, per the brief.

## Testing — what was done, and the honest sandbox limitation

Every Prisma call across all 10 files was manually cross-checked field-by-field against the real schema. Two real mistakes caught and fixed during this build:
1. Assumed a `description` field on `MembershipPlanBenefit` that doesn't exist — corrected to the real `MembershipBenefitKey` enum.
2. Used an unnecessary `as never` cast on cache calls — removed once the type was confirmed to accept the values directly.

**This sandbox has no live database connection and is network-blocked from Prisma's binary CDN** (same constraint as both prior phases). Not executable here: `npx tsc --noEmit`, `npm run build`, the 20 functional/security tests, N+1 measurement against real data.

**Run for the real result:**
```bash
npx tsc --noEmit
npm run build
```
Then from a real session, call `getWalletData(otherCustomersId, myUserId)` and confirm it throws `AccessDeniedError` — that's the concrete proof behind this phase's security claim.
