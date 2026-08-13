# Saveo AI Context Builder

**Additive-only. Backend context assembly only — no AI model, no chat UI, per the brief.** Assembles a unified `SaveoAIContext` object entirely from Phase 3 (`intelligence-access`), which itself reads Phase 2 (Data Warehouse) and Phase 1 (Intelligence Core). Nothing here queries Prisma for business data directly — the only direct Prisma usage in this whole layer is `intent-parser.ts`'s real category/brand name matching.

## Architecture

```
Customer Request → buildContext() → Phase 3 Access Layer
→ Data Warehouse / Intelligence Core → SaveoAIContext → future AI (not built)
```

```
ai-context/
├── types.ts              13 context types + SaveoAIContext (the unified object)
├── intent-parser.ts      Rule-based intent detection — NO LLM
├── context-builder.ts    buildContext() — the single assembly entry point
├── audit-log.ts          Safe logging (structure only)
└── index.ts
```

## No LLM anywhere in this layer

Intent detection in `intent-parser.ts` is real regex/keyword matching — budget extraction via numeric patterns, category/brand matching against REAL `Category`/`Product.brandName` rows (never a hardcoded list), gift/deal/cart/reorder detection via bilingual keyword sets. Deterministic, structured parsing — not a model call.

## Security — inherited from Phase 3, applied correctly here

`buildContext()` never calls a customer-scoped Phase 3 function unless `requestingUserId` is present, and always passes it as BOTH the target and the requester (`getWalletData(uid, uid)`). Phase 3's `assertOwnership()` is always comparing a value to itself for a legitimate call — no code path here can construct a cross-user request. An anonymous request skips the entire customer-scoped block; `context.customer/.cart/.wallet/.loyalty/.membership/.orders/.recommendations` are genuinely `undefined`, never fake empty objects.

## Zero invented data

`ProductContext.activePromotions` and `BrandContext.activePromotions` are honestly `[]` — Phase 3 doesn't yet expose a product/brand-scoped promotion join, so rather than approximate a match, this returns genuinely empty. Every `null` from Phase 3 (return risk, demand score, growth rate when data is insufficient) passes through as `null`, never backfilled.

## Context size — bounded

`getActivePromotions(15)`, `searchRelevantProducts(limit: 4)` for alternatives, `getCustomerOrderHistory(5)`, `getRelevantRecommendations(6)` — all capped, never the full catalog or full order history.

## Context versioning

Every `SaveoAIContext.metadata` includes `contextVersion`, `generatedAt`, `dataFreshness` (per-source age), and `sources`.

## Audit logging — safe by construction

Logs only: requesting user ID, detected intent, which sections were populated, duration. Never logs wallet balances, cart totals, prices, or points.

## Walked-through test scenarios (manual trace — see limitation below)

1. **"أريد شوكولاتة أقل من 5 KD"** → `budget: 5` extracted; real category match if a Chocolate category exists → `intent: "BUDGET_SHOPPING"`.
2. **"ما أفضل منتج من هذه الفئة؟"** → matches comparison keywords → `intent: "PRODUCT_COMPARISON"`.
3. **"أريد هدية لزوجتي"** → matches gift keywords (checked first) → `intent: "GIFT"`.
4. **"ماذا تقترح لي؟"** → no match → `GENERAL_SHOPPING`; `context.recommendations` populated via real `RecommendationService` for an authenticated requester.
5. **"كيف أوفر في السلة؟"** → matches cart keywords → `intent: "CART_OPTIMIZATION"`; `context.cart` populated.
6. **"متى يجب أن أشتري..."** → matches reorder keywords → `intent: "REORDER"`.
7. **Anonymous user** → customer-scoped block entirely skipped, only public sections populated.
8. **Saveo Plus member** → real `freeDeliveryEligible`/`extraDiscountPercent` from actual `MembershipBenefitKey` rows.
9. **Multi-product cart** → all real `CartItem` rows, no arbitrary line-count limit.
10. **Nonexistent product** → `getProductIntelligence` returns `null` → `context.product` simply never set, no error, no fake product.

## Honest testing limitation — same as all three prior phases

This sandbox has no live database connection and is network-blocked from Prisma's binary CDN. `npx tsc --noEmit` and `npm run build` were not executable here — every Prisma call and cross-file type usage was manually cross-checked field-by-field against the real schema and Phase 1/2/3's actual exported types. The 10 scenarios above are traced through real code logic, not live-executed.

**Two real issues caught and fixed during this build:**
1. `intent-parser.ts` defined `BUDGET_SHOPPING_KEYWORDS` but never checked it — a real logic gap (confirmed `noUnusedLocals` is off, so it wouldn't have failed the build, but budget-style queries without an explicit number would have silently gone undetected). Fixed.
2. `context-builder.ts`'s error handler had two branches doing the identical `throw err` — simplified to one.

**Run for the real result:**
```bash
npx tsc --noEmit
npm run build
```
Then call `buildContext({ query: "أريد شوكولاتة أقل من 5 KD", requestingUserId: null })` and confirm `intent.budget === 5`, `intent.intent === "BUDGET_SHOPPING"`, and `context.customer` is `undefined`.
