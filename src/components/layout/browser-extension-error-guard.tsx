"use client";

import { useEffect } from "react";

/**
 * Known browser-extension DOM conflict suppressor.
 *
 * "Failed to execute 'removeChild'/'insertBefore' on 'Node': ... is not
 * a child of this node" is a well-documented class of error caused by
 * browser extensions (translators, password managers, Grammarly-style
 * tools, ad blockers) mutating the DOM directly, outside React's
 * control, at the same moment React tries to update the same nodes
 * during client-side navigation. It is not caused by application code
 * and does not affect functionality — the page continues to work
 * correctly. This only prevents it from surfacing as an alarming
 * "Unhandled Runtime Error" screen (dev) or an uncaught console error
 * (production); it does not suppress genuine application errors.
 */
const DOM_CONFLICT_PATTERN = /(removeChild|insertBefore).*not a child of this node/i;

export function BrowserExtensionErrorGuard() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      if (DOM_CONFLICT_PATTERN.test(event.message ?? "")) {
        event.preventDefault();
      }
    }
    function handleRejection(event: PromiseRejectionEvent) {
      const message = event.reason?.message ?? String(event.reason ?? "");
      if (DOM_CONFLICT_PATTERN.test(message)) {
        event.preventDefault();
      }
    }
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
