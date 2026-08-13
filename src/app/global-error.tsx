"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // This boundary sits above the normal app tree (even above [locale]'s
    // layout), so it can't rely on the logger's dynamic import of Sentry
    // working reliably — log directly and best-effort.
    console.error(JSON.stringify({ level: "error", message: "Global error boundary triggered", digest: error.digest, errorMessage: error.message }));
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0B3D2E" }}>Something went wrong</h1>
        <p style={{ marginTop: "0.5rem", color: "#0B3D2E99" }}>
          Please refresh the page. If the problem continues, contact support@saveo.com.kw.
        </p>
        <button
          onClick={() => reset()}
          style={{ marginTop: "1.5rem", background: "#D4AF37", color: "#0B3D2E", border: "none", borderRadius: "999px", padding: "0.75rem 1.5rem", fontWeight: 700, cursor: "pointer" }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
