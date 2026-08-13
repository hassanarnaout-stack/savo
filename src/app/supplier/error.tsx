"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

function isRedirectSignal(error: Error & { digest?: string }): boolean {
  return !!error.digest?.startsWith("NEXT_REDIRECT");
}

export default function SupplierError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (isRedirectSignal(error)) return;
    console.error("[supplier area error]", error);
  }, [error]);

  if (isRedirectSignal(error)) {
    throw error;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:px-6">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <h1 className="mt-4 text-xl font-bold text-saveo-emerald-700">Something went wrong</h1>
      <p className="mt-2 text-sm text-saveo-emerald-700/60">
        We hit an unexpected error loading this page. Your data is safe — try again.
      </p>
      <button onClick={() => reset()} className="btn-primary mt-6">
        Try Again
      </button>
    </div>
  );
}
