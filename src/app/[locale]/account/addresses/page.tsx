import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { AddressService } from "@/lib/services/address-service";
import { AddressesManager } from "@/components/account/addresses-manager";

/**
 * SAVO Addresses — exact V22 visual transplant (AccountPage
 * 'addresses' section, V22 CustomerPages.tsx) — now backed by the
 * REAL AddressService built in this same task (previously this page
 * didn't exist at all; the address-management foundation was
 * entirely missing, confirmed by a prior read-only audit). Zero mock
 * addresses — real AddressService.list(), real Add/Edit/Delete/Set
 * Default actions calling the real /api/addresses endpoints.
 */
export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/addresses");

  const [addresses, locale] = await Promise.all([
    AddressService.list(session.user.id),
    getLocale(),
  ]);

  return (
    <div className="savo-addr-page">
      <AddressesManager addresses={addresses as any} isArabic={locale === "ar"} />
    </div>
  );
}
