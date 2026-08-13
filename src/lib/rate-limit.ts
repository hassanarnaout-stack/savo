/**
 * Rate Limiting — Phase 4.5 (Production Hardening)
 *
 * IMPORTANT LIMITATION (documented, not hidden): this is an in-memory
 * sliding-window limiter. It works correctly for a single Node.js
 * instance (which is exactly what most early-stage/beta deployments run
 * on — one Vercel/Railway/Fly instance, or one traditional server). It
 * does NOT share state across multiple instances/regions. Before scaling
 * horizontally, replace the `hits` Map below with a Redis-backed store
 * (e.g. Upstash Redis + @upstash/ratelimit) — the `checkRateLimit`
 * function signature is designed to make that swap a one-file change.
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const hits = new Map<string, number[]>();

// Periodic cleanup so `hits` doesn't grow unbounded over a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of hits) {
    const recent = timestamps.filter((t) => now - t < 60 * 60 * 1000); // drop anything older than 1h
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}, 5 * 60 * 1000).unref?.();

export const RATE_LIMITS = {
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 10 } satisfies RateLimitConfig, // 10 attempts / 15 min
  REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 5 } satisfies RateLimitConfig, // 5 accounts / hour / IP
  CHECKOUT: { windowMs: 5 * 60 * 1000, maxRequests: 10 } satisfies RateLimitConfig, // 10 orders / 5 min
  SENSITIVE_POST: { windowMs: 60 * 1000, maxRequests: 20 } satisfies RateLimitConfig, // general POST guard
  MOBILE_API: { windowMs: 60 * 1000, maxRequests: 100 } satisfies RateLimitConfig, // Phase 7.6 — general mobile read/write traffic per user
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param identifier Typically `${ip}:${routeName}` — callers build this so
 *   different routes don't share the same bucket for the same IP.
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const existing = hits.get(identifier) ?? [];
  const withinWindow = existing.filter((t) => t > windowStart);

  if (withinWindow.length >= config.maxRequests) {
    const resetAt = withinWindow[0] + config.windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }

  withinWindow.push(now);
  hits.set(identifier, withinWindow);

  return { allowed: true, remaining: config.maxRequests - withinWindow.length, resetAt: now + config.windowMs };
}

/**
 * Read-only status check — does NOT consume an attempt. Used by the login
 * page to show a clear "too many attempts" message BEFORE even trying to
 * sign in, since NextAuth's Credentials `authorize()` can only return
 * null/a user (no channel to surface a distinct "rate limited" message
 * to the client separately from "wrong password") — see login page for
 * how this is used together with the real, attempt-consuming check
 * inside `authorize()`.
 */
export function peekRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const existing = hits.get(identifier) ?? [];
  const withinWindow = existing.filter((t) => t > windowStart);

  if (withinWindow.length >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: withinWindow[0] + config.windowMs };
  }
  return { allowed: true, remaining: config.maxRequests - withinWindow.length, resetAt: now + config.windowMs };
}

/** Best-effort client IP extraction behind common proxies (Vercel, Cloudflare, generic). */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
