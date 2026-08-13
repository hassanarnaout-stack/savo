/**
 * Logger Service — Phase 4.5 (Production Hardening)
 *
 * Single choke point for all application logging. Right now it writes
 * structured JSON lines to the console (which most hosting platforms —
 * Vercel, Railway, Fly — already capture and make searchable). When
 * Sentry (or another provider) is wired up via SENTRY_DSN, `error()` also
 * forwards to it — see src/lib/sentry.ts.
 */

type LogContext = Record<string, unknown>;

function format(level: string, message: string, context?: LogContext) {
  return JSON.stringify({
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(format("info", message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(format("warn", message, context));
  },
  error(message: string, error?: unknown, context?: LogContext) {
    const errorDetails =
      error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : error
        ? { errorValue: String(error) }
        : {};
    console.error(format("error", message, { ...context, ...errorDetails }));

    // Fire-and-forget — inert until SENTRY_DSN is configured (see sentry.ts).
    import("@/lib/sentry")
      .then(({ captureException }) => captureException(error instanceof Error ? error : new Error(message), context))
      .catch(() => {});
  },
};
