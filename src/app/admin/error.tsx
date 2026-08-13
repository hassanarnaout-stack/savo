"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";

function isRedirectSignal(error: Error & { digest?: string }): boolean {
  return !!error.digest?.startsWith("NEXT_REDIRECT");
}

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (isRedirectSignal(error)) return;
    logger.error("Unhandled error in admin dashboard", error, { digest: error.digest });
  }, [error]);

  if (isRedirectSignal(error)) {
    throw error;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-saveo-emerald-700/60">An unexpected error occurred loading this page.</p>
      <button onClick={() => reset()} className="btn-primary mt-6">Try Again</button>
    </div>
  );
}
