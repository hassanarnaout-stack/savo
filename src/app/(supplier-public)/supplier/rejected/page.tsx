import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { XCircle } from "lucide-react";
import { SupplierStatusPage } from "@/components/supplier/supplier-status-page";

/**
 * SAVO Supplier — Application Rejected. Sibling state of
 * /supplier/pending, same shared SupplierStatusPage shell (dark SAVO
 * card, no operational Supplier Portal nav) with a restrained
 * red/warning accent for the status icon only — the SAVO teal/dark
 * system remains dominant. Content/meaning 100% unchanged: same gate
 * redirects, same personalized copy, same real contact email. No
 * invented appeal/resubmit/retry workflow — the audit confirmed none
 * exists.
 */
export default async function SupplierRejectedPage() {
  const gate = await getSupplierAccountGate();

  if (gate.ok) redirect("/supplier");
  if (gate.reason === "NOT_AUTHENTICATED") redirect("/login?callbackUrl=/supplier/rejected");
  if (gate.reason === "WRONG_ROLE") redirect("/");
  if (gate.reason === "NO_SUPPLIER_PROFILE") redirect("/supplier/register");
  if (gate.reason === "PENDING") redirect("/supplier/pending");
  if (gate.reason === "SUSPENDED") redirect("/supplier/suspended");

  const { supplier } = gate;

  return (
    <SupplierStatusPage
      accent="red"
      icon={<XCircle className="h-7 w-7" />}
      title="Application not approved"
      message={
        <>
          Unfortunately, {supplier.companyName}'s application wasn't approved this time. If you believe this
          was a mistake or would like more information, please contact our supplier team.
        </>
      }
      contactEmail="suppliers@saveo.com.kw"
    />
  );
}
