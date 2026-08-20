import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";
import { SupplierStatusPage } from "@/components/supplier/supplier-status-page";

/**
 * SAVO Supplier — Account Suspended. Sibling state of
 * /supplier/pending, same shared SupplierStatusPage shell with a
 * restrained amber/warning accent for the status icon only. Content
 * unchanged: same gate redirects, same personalized copy, same real
 * contact email. No invented reactivate/appeal/support-ticket flow.
 */
export default async function SupplierSuspendedPage() {
  const gate = await getSupplierAccountGate();

  if (gate.ok) redirect("/supplier");
  if (gate.reason === "NOT_AUTHENTICATED") redirect("/login?callbackUrl=/supplier/suspended");
  if (gate.reason === "WRONG_ROLE") redirect("/");
  if (gate.reason === "NO_SUPPLIER_PROFILE") redirect("/supplier/register");
  if (gate.reason === "PENDING") redirect("/supplier/pending");
  if (gate.reason === "REJECTED") redirect("/supplier/rejected");

  const { supplier } = gate;

  return (
    <SupplierStatusPage
      accent="amber"
      icon={<AlertTriangle className="h-7 w-7" />}
      title="Account suspended"
      message={
        <>
          {supplier.companyName}'s Savo supplier account is currently suspended. Please contact our
          supplier team to resolve this and restore access.
        </>
      }
      contactEmail="suppliers@saveo.com.kw"
    />
  );
}
