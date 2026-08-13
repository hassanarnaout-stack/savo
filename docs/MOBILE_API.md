# Saveo Mobile API — v1

Base URL: `https://<your-domain>/api/mobile/v1`

All authenticated endpoints require `Authorization: Bearer <accessToken>`.

## Authentication

### `POST /auth/login`
Body: `{ email, password, deviceInfo? }`
Returns: `{ accessToken, refreshToken, expiresIn, user }`
- `accessToken` — HMAC-signed, expires in 15 minutes (`expiresIn` is seconds).
- `refreshToken` — opaque random token, valid 60 days, single-use (rotates on every refresh).
- Rate limited: 10 attempts / 15 min per email.

### `POST /auth/refresh`
Body: `{ refreshToken }`
Returns a new `{ accessToken, refreshToken, expiresIn }` pair. The old refresh token is revoked immediately (rotation) — reusing it fails with 401, which should be treated as "log in again."

### `POST /auth/logout`
Body: `{ refreshToken }`
Revokes the refresh token server-side. Always call this on explicit logout.

## Catalog

### `GET /products?page=1&pageSize=20&categoryId=<id>`
Public, no auth required. `pageSize` capped at 50. Rate limited: 100 req/min per IP.

### `GET /deep-link?path=<path>`
Resolves a deep-link path to a screen + params for the app to route to. Supported: `product/<slug>`, `category/<slug>`, `order/<id>`.
URL scheme convention: `saveo://open?path=<path>` or universal link `https://<domain>/app/<path>`.

## Orders

### `GET /orders`
Auth required. Returns the authenticated user's last 50 orders.

## Wishlist

Backed by the same `Favorite` table the web app uses — a product favorited on one device shows as favorited everywhere immediately.

### `GET /wishlist`
Auth required. Returns `{ productIds: string[], syncedAt }`.

### `POST /wishlist`
Auth required. Body: `{ productId }`. Idempotent.

### `DELETE /wishlist?productId=<id>`
Auth required.

## Cart Sync

Distinct from the web app's cart (intentionally client-side-only). Lets one user's cart follow them across their own devices. Last-write-wins.

### `GET /cart/sync`
Auth required. Returns `{ items, updatedAt }`.

### `POST /cart/sync`
Auth required. Body: `{ items: [{ productId, quantity }] }`. Overwrites the stored cart entirely.

## Push Notifications

### `POST /push-token`
Auth required. Body: `{ token, platform: "IOS" | "ANDROID" }`.

**Status: send infrastructure is built but not credentialed.** `FCM_SERVER_KEY` (Android) and `APNS_KEY_ID`/`APNS_TEAM_ID`/`APNS_PRIVATE_KEY` (iOS) are not set. Registration works today; delivery requires provisioning those credentials with Google/Apple first — see `PushNotificationService`.

## Rate Limits

| Bucket | Limit |
|---|---|
| Login | 10 / 15 min per email |
| Everything else (`MOBILE_API`) | 100 / min per user or IP |

## Pagination

Products use `page` + `pageSize` (max 50), returning `{ pagination: { page, pageSize, total, totalPages } }`. Orders and wishlist currently return a capped list without pagination.

## Image Optimization

Request a resized version through Next.js's built-in endpoint: `/_next/image?url=<url-encoded original>&w=<width>&q=<quality>`.

## Compression

Responses are gzip/brotli-compressed by Next.js (`compress: true`).

## Offline Sync

Not yet a dedicated delta-sync endpoint — a real gap, flagged rather than faked. Today's pattern: cache each endpoint's response client-side with its `syncedAt`/`updatedAt`, refetch when back online.

## Versioning

This is `v1`. Breaking changes ship as `/api/mobile/v2/...` with `v1` kept running until the app is confirmed migrated.
