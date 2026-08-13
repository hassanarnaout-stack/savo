"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackClientEvent } from "@/lib/track-client-event";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackClientEvent("PAGE_VIEW", { metadata: { path: pathname } });
  }, [pathname]);

  return null;
}
