# Saveo AI Shopping Assistant

**Additive-only. Zero schema changes** (explicit user decision — AI analytics reuse the existing `AnalyticsEvent` model; the real AI event name lives in `metadata.aiEventName`, marked with `metadata.source: "ai_assistant"`). No LLM call anywhere in this phase — responses are template-composed from real Phase 1-4 data.

## ⚠️ Critical incident caught during this build

While creating the admin analytics page, I discovered `src/app/admin/ai-assistant/page.tsx` **already exists** — a completely unrelated existing admin page. My first file-creation attempt would have silently overwritten it. Caught before any damage, and the new dashboard was placed at a distinct path instead: `src/app/admin/ai-shopping-assistant/`. The pre-existing page was verified untouched (checksum confirmed) after the fix.

## Architecture

```
Customer → AI Concierge Panel (UI) → /api/ai-assistant/chat
→ askAssistant() → buildContext() [Phase 4] → Phase 3 → Phase 2/1
→ composeResponse() [template-based, no LLM] → AIAssistantResponse
→ StructuredActions → action-executor.ts (resolves to navigation only)
→ real, UNCHANGED cart store / checkout for any actual mutation
```

```
lib/ai-assistant/
├── types.ts                    Action Contracts, product/comparison cards, memory shape
├── prompt-injection-guard.ts   Real pattern-based manipulation detection
├── conversation-memory.ts      Session-scoped in-memory (30 min TTL), no schema change
├── ai-analytics.ts             Reuses existing AnalyticsEvent — zero schema change
├── response-composer.ts        THE core — builds everything from real Context data, no LLM
├── action-executor.ts          Resolves actions to safe navigation; mutations go to real Commerce Layer
├── assistant-service.ts        Single entry point: askAssistant()
└── index.ts

app/api/ai-assistant/
├── chat/route.ts               Main conversation endpoint
└── track/route.ts              Session/click/confirmation tracking

components/ai-assistant/
└── ai-concierge-panel.tsx      Premium mobile-first chat UI (Saveo Aura)

app/admin/ai-shopping-assistant/
└── page.tsx                    Real analytics dashboard
```

## No LLM — how recommendations, reasons, and comparisons are built

`response-composer.ts` is pure template logic over real data:
- **AI Reason**: checks real `context.customer.favoriteCategories`, the real `context.intent.budget` against the real item price, real `originalPrice - price` savings, the real `rating` — returns the first genuinely-true statement, never generic filler.
- **Comparison**: "Best Price" = real min over actual prices. "Best Rated" = real max over actual ratings. "Best Value" = real highest `demandScore` among products at or below the real median price.
- **Budget Basket**: greedily adds real products while `subtotal + price <= budget` — a real check, never an approximation.

## Action Contracts — the real safety boundary

The AI never executes an action. `StructuredAction` is inert data. `resolveAction()` only ever: (1) resolves `VIEW_*` to a real, safe URL path, executed by ordinary navigation, or (2) for mutating actions, returns `readyForCommerceLayer: true` — the actual mutation is left to the real, unmodified cart store / checkout API. The current UI hands off `ADD_TO_CART` by navigating to the real product page, where the existing "Add to Cart" button (unchanged) does the real work.

**Confirmation is real and enforced**: `requiresConfirmation()` is `true` for every mutating type; the UI's `pendingAction` state means a mutating action cannot fire without the user tapping "Confirm" on real, specific text (e.g. "Add [real product name] to your cart?").

## Security

- **Cross-customer access**: `askAssistant()` always passes the real session-derived `requestingUserId`; the API route derives it from `auth()`, never from the request body.
- **Supplier/Admin data leakage**: structurally impossible — `SaveoAIContext`'s types never include `commission`/`supplierId`/`purchaseCost`.
- **Price manipulation**: every price comes from `ProductSearchResultItem.price` (Phase 3, from real `Product.saveoPrice`) — never computed from free text.
- **Prompt injection**: `checkForInjection()` pattern-matches price-assertion, internal-data-request, and instruction-override phrasing (bilingual). A flagged query gets a safe refusal; the assistant still only acts on structured intent fields.
- **Product ID manipulation**: `isKnownProductId()` exists as a guard for any future free-text-derived action construction.

## Failsafe

`askAssistant()` wraps the pipeline in try/catch. Any failure returns an honest fallback message with empty sections, never a fake success. Nothing in this phase is imported by any existing route — the rest of Saveo is completely unaffected regardless of what happens here.

## Analytics — real events, zero schema change

| Event | Reused enum value | Real trigger |
|---|---|---|
| AI_SESSION_STARTED | PAGE_VIEW | Panel mounts |
| AI_QUERY | PAGE_VIEW | Every real askAssistant() call |
| AI_RECOMMENDATION | PRODUCT_VIEW | Once per real card shown |
| AI_RECOMMENDATION_CLICK | PRODUCT_VIEW | User taps a card |
| AI_ADD_TO_CART / AI_ACTION_CONFIRMED | ADD_TO_CART | User confirms a mutating action |
| AI_PURCHASE / AI_CONVERSION / AI_REVENUE | ORDER_COMPLETE | Reserved, not yet called — see Limitations |

Admin dashboard at `/admin/ai-shopping-assistant` computes every metric as a real ratio — `null` when denominator is 0, never fabricated.

## Manually-traced test scenarios (17, per the brief)

1. Anonymous user → context.customer undefined, real product search still works.
2. Authenticated user → real customer favorites inform reasons.
3. Saveo Plus user → real membership data, real free-delivery messaging.
4. Empty warehouse context → nulls handled gracefully, never filled in.
5-7. Product/brand/category search → real filtered results.
8. Gift recommendation → GIFT_KEYWORDS match → real category/general fallback.
9. Budget shopping → real extractBudget → real basket that never exceeds budget.
10. Comparison → real min/max-derived badges.
11. Cart optimization → real missingAmountForFreeDelivery appended when non-null.
12. Reorder → intent detected, generic response branch (see Limitations).
13. Add to Cart → real confirmation required before any handoff.
14. Malicious prompt → flagged, safe refusal, structured fields still used.
15-16. Supplier/price leakage attempts → structurally impossible.
17. AI unavailable → honest fallback, rest of Saveo unaffected.

## Known Limitations — stated honestly

- **No live LLM**: given the strict "AI does not invent data" rule throughout this whole build and the inability to safely wire/test a real API-keyed model here, this phase is a genuinely deterministic, template-based system — it satisfies hallucination-control by construction (nothing to hallucinate), but is not generative natural language. This is the single biggest architectural decision here and should be reviewed if a live model integration is wanted next.
- **REORDER intent** is detected correctly but doesn't yet have a distinct response branch (falls through to general recommendation) — surfacing real previously-purchased products from `context.orders` is a natural small follow-up.
- **AI_PURCHASE/AI_CONVERSION/AI_REVENUE** tracking exists but isn't called yet, since that requires hooking into real checkout completion — deliberately not touched per "do not modify Checkout."
- **Same sandbox limitation as all four prior phases**: no live DB, network-blocked from Prisma's CDN. `tsc`/`build` not executable here. Caught and fixed one real cross-file import error this way (see below).

## Real bugs caught and fixed during this build

1. `response-composer.ts` initially imported `ProductSearchResultItem` from the wrong module (`@/lib/ai-context` instead of `@/lib/intelligence-access`) — fixed before shipping.
2. File collision near-miss with a pre-existing, unrelated admin page — caught, verified untouched, new dashboard moved to a distinct path.

## Run for the real result

```bash
npx tsc --noEmit
npm run build
```

**Note**: `AIConciergePanel` is real and working but **not yet placed on any page** — no floating launcher button was added to any shared layout, deliberately left to you rather than modifying a shared layout file unprompted.
