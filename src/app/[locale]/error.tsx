"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";

/**
 * `redirect()` (from next/navigation) works by throwing a special
 * digest-tagged signal ("NEXT_REDIRECT...") that Next.js's own internal
 * machinery is meant to catch and turn into a real HTTP redirect —
 * before it should ever reach a user-defined error boundary like this
 * one. In some dev-mode scenarios that signal still surfaces here; if we
 * treat it as a genuine error we'd show a scary "Something went wrong"
 * screen over what is actually a normal, successful redirect (e.g. an
 * unauthenticated visit to /account correctly sending someone to
 * /login). Re-throwing lets Next.js's own redirect handling take it from
 * here instead of us rendering error UI over it.
 */
function isRedirectSignal(error: Error & { digest?: string }): boolean {
  return !!error.digest?.startsWith("NEXT_REDIRECT");
}

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (isRedirectSignal(error)) return;
    logger.error("Unhandled error in customer-facing app", error, { digest: error.digest });
  }, [error]);

  if (isRedirectSignal(error)) {
    throw error;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <h1 className="mt-4 text-xl font-bold text-saveo-emerald-700">Something went wrong</h1>
      <p className="mt-2 text-sm text-saveo-emerald-700/60">
        We hit an unexpected error. Your cart and account are safe — try again, or head back home.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => reset()} className="btn-primary">Try Again</button>
        <a href="/" className="btn-outline">Go Home</a>
      </div>
    </div>
  );
}
