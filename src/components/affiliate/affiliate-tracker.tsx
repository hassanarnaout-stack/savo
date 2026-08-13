"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";

export function AffiliateTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const code = searchParams.get("ref");

  useEffect(() => {
    if (!code) return;
    fetch("/api/affiliate/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, landingPath: pathname, referrerUrl: document.referrer || undefined }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return null;
}
