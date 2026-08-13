/**
 * Sentry Integration — Phase 4.5 (Production Hardening)
 *
 * Deliberately a no-op stub with ZERO reference to the `@sentry/nextjs`
 * package anywhere in this file. This matters: Next.js's webpack build
 * statically resolves `import()` calls at build time even when they're
 * behind a runtime condition — so a dynamic import of an uninstalled
 * package still fails the build. The only way to make this truly
 * optional until a real DSN/package exist is to not reference the
 * package at all until someone deliberately activates it.
 *
 * TO ACTIVATE (once you have a real Sentry DSN):
 *   1. npm install @sentry/nextjs
 *   2. Run: npx @sentry/wizard@latest -i nextjs
 *      (this generates sentry.client.config.ts / sentry.server.config.ts
 *      and wires them into next.config.js — that's the standard,
 *      supported way to integrate Sentry with Next.js, and it will also
 *      rewrite this file to call the real SDK.)
 *   3. Set SENTRY_DSN in your environment.
 *
 * Until then, `logger.error()` (src/lib/logger.ts) calls into this file
 * and gets a safe no-op — errors still go to structured console logs.
 */

export async function captureException(_error: Error, _context?: Record<string, unknown>) {
  // no-op — see file header for activation steps
}

export async function captureMessage(_message: string, _context?: Record<string, unknown>) {
  // no-op — see file header for activation steps
}

export const sentryEnabled = false;
