"use client";

import { signOut } from "next-auth/react";

/**
 * Minimal top-right sign-out action for the onboarding shell — same
 * real signOut() call/functionality as SidebarLogoutButton (the
 * operational-portal version), just restyled for a page with no
 * dashboard nav to live inside.
 */
export function SupplierPendingLogout() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })} className="savo-supplier-onboard-topright savo-supplier-onboard-topright--button">
      Sign out
    </button>
  );
}
