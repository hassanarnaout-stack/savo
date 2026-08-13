# Saveo — Production Guide

This document covers what's needed to deploy, monitor, and operate Saveo in a real (trial or production) environment. It's written for whoever is on call when something breaks at 2am — be direct and concrete.

---

## 1. Deployment

Saveo is a standard Next.js 15 App Router application. It has no special infrastructure requirements beyond a PostgreSQL database.

**Recommended platform:** Vercel (zero-config for Next.js) or any Node.js host that supports Next.js's standalone output (Railway, Fly.io, a plain VPS with `next start`).

**Build command:** `npm run build`
**Start command:** `npm run start`
**Node version:** 20+

**Before every deploy:**
```bash
npx prisma validate     # schema syntax check
npx prisma db push      # sync schema to the target database (see §3)
npm run build            # will fail the build if there are type errors
```

**Known limitation:** the current rate limiter (`src/lib/rate-limit.ts`) is in-memory and only works correctly on a **single running instance**. If you deploy to a platform that runs multiple instances/regions (e.g. Vercel's multi-region edge, or horizontal scaling), rate limits will not be shared across instances. Before scaling horizontally, replace it with a Redis-backed limiter (Upstash Redis + `@upstash/ratelimit` is a drop-in fit) — see the comment at the top of that file.

---

## 2. Environment Variables

See `.env.example` for the full list with inline explanations. Summary:

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** | Use a pooled connection string in production |
| `AUTH_SECRET` | **Yes** | `openssl rand -base64 32` — never reuse across environments |
| `NEXTAUTH_URL` | **Yes** | Must match the real deployed URL exactly |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Used for SEO metadata, sitemap, OG images |
| `SENTRY_DSN` | Recommended | Inert until set — see §5 |
| `KNET_MERCHANT_ID`, `CARD_GATEWAY_API_KEY`, `APPLE_PAY_MERCHANT_ID` | Not yet usable | Payment gateways are architected (`PaymentService`) but not integrated — see §7 |
| `UPLOADTHING_TOKEN` | Not yet usable | No upload endpoint exists yet — product images are URL-only today |

---

## 3. Database

- **Provider:** PostgreSQL (built and tested against Neon)
- **Migrations:** this project uses `prisma db push` (schema-sync), not `prisma migrate`. There is no migration history file — every schema change so far has been additive (new nullable columns/tables) specifically to avoid destructive migrations against live data. **If you introduce a genuinely destructive schema change, switch to `prisma migrate dev`/`deploy` for that change so it's reversible and auditable.**
- **Indexes:** all high-traffic query paths (supplier product lookups, order history, inventory history, transaction reporting) have explicit `@@index` declarations — reviewed across multiple audit passes during development.
- **Connection pooling:** Neon provides built-in pooling. If self-hosting Postgres, put PgBouncer (or similar) in front of it before going live — Prisma opens a connection per request without one.

---

## 4. Backups

**Not yet configured with a tested, documented process.** This is a real gap, flagged honestly:

- Neon (if used) provides Point-in-Time Recovery automatically on paid tiers — confirm your plan includes it and know how to trigger a restore *before* you need to.
- No automated logical backup (`pg_dump` on a schedule) exists in this codebase. Set one up before handling real customer/order data at any meaningful volume.
- **Test a restore, not just a backup.** An untested backup is a hope, not a plan.

---

## 5. Monitoring & Error Tracking

- `src/lib/logger.ts` — structured JSON logs to stdout (`info`/`warn`/`error`). Most hosts (Vercel, Railway, Fly) capture and let you search these by default with zero extra setup.
- `src/lib/sentry.ts` — Sentry integration point, **inert until `SENTRY_DSN` is set**. To activate:
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```
  then set `SENTRY_DSN` in your environment. `logger.error()` already forwards to it automatically once active — no call-site changes needed.
- **Recommendation:** don't run a real trial without Sentry (or equivalent) active. Right now, an error in production is only visible if someone is actively tailing logs.

---

## 6. Secrets Management

- Local/dev: `.env` file (gitignored — confirm `.gitignore` includes it before any commit).
- Production: use your host's secret manager (Vercel Environment Variables, Railway Variables, AWS Secrets Manager, etc.) — **never** commit real secrets to the repo, and never put them in `next.config.js` or any file that ships to the client.
- `AUTH_SECRET` and `DATABASE_URL` are the two secrets that matter most — rotate `AUTH_SECRET` if it's ever suspected to have leaked (this invalidates all active sessions, which is the correct/safe outcome).

---

## 7. Payment Readiness

`src/lib/services/payment-service.ts` defines the full abstraction (`PaymentService.initiatePayment(...)`), and checkout already depends on this layer rather than inline logic. **No real gateway is connected yet, by design** (this was explicit scope for this hardening phase).

Cash on Delivery is the only method that actually "processes" today — orders placed with KNET/Card are still created successfully (so existing tested checkout behavior isn't broken), but the payment layer honestly logs that no gateway is connected rather than pretending to have charged the customer.

**Before accepting real online payments:** implement a real `PaymentProvider` for each gateway you intend to support (start with KNET, the dominant method in Kuwait), register it in the `providers` array in that file, and set the matching env var. No other file needs to change.

---

## 8. Image Readiness

`next.config.js`'s `images.remotePatterns` controls which external domains product images can load from. It currently allow-lists a handful of common CDNs (S3, Cloudinary, CloudFront, Google, Imgix, Unsplash, Picsum for seed data).

**A real supplier's image URL from an unlisted domain will fail to render.** Before onboarding suppliers broadly:
- Either build a real image upload flow (the `UPLOADTHING_TOKEN` variable is reserved for this) so images live on a domain you control, or
- Maintain the allow-list actively as new supplier domains come in — do **not** switch to a wildcard `hostname: "**"` pattern; that reintroduces SSRF/abuse risk this allow-list exists to prevent.

---

## 9. Troubleshooting

| Symptom | Likely cause | Where to look |
|---|---|---|
| Checkout fails with a generic error | Prisma transaction timeout under load, or a DB connectivity blip (Neon "scale to zero" cold start) | Server logs around the `/api/checkout` request; the transaction has a 20s timeout configured |
| "Too many attempts" on login/register/checkout | Rate limiter triggered (see `src/lib/rate-limit.ts`) | Check if it's a legitimate user being blocked vs. an actual abuse pattern |
| Supplier can't see their own products | `requireVerifiedSupplier()` gate — check the supplier's `status`/`verificationStatus` in the `suppliers` table | `/admin/suppliers/[id]` |
| A product image doesn't load | Domain not in `next.config.js` `remotePatterns` (see §8) | Browser console will show a Next.js image-optimization 400 error |
| Membership benefits not applying at checkout | `Membership.status` may have auto-expired (`endsAt` passed) — this is self-healing on next read via `MembershipService.getUserMembership`, but there's no proactive renewal job yet | `memberships` table, `MembershipService` |

---

## Known Gaps Going Into Any Real Launch

These are documented, not hidden — see the Launch Readiness Audit and this phase's final report for full detail:

1. No real payment gateway connected (architecture ready, integration pending)
2. No refund flow (manual only, via direct DB/admin intervention today)
3. Rate limiter is single-instance only
4. No automated backup schedule configured
5. No automated membership renewal job (manual re-subscribe works; `autoRenew` flag exists but nothing acts on it yet)
