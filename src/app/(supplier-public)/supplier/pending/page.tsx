import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { Clock } from "lucide-react";
import { SupplierStatusPage } from "@/components/supplier/supplier-status-page";

/**
 * SAVO Supplier — Application Pending. Uses the shared SupplierStatusPage
 * visual shell (also used by /supplier/rejected and /supplier/suspended).
 * Gate/redirect logic stays explicit here, server-side — the shared
 * component never sees or makes access decisions. Content/meaning 100%
 * unchanged: same gate redirects, same copy, same "1–2 business days"
 * review time — no invented claims, no fake progress.
 */
export default async function SupplierPendingPage() {
  const gate = await getSupplierAccountGate();

  if (gate.ok) redirect("/supplier");
  if (gate.reason === "NOT_AUTHENTICATED") redirect("/login?callbackUrl=/supplier/pending");
  if (gate.reason === "WRONG_ROLE") redirect("/");
  if (gate.reason === "NO_SUPPLIER_PROFILE") redirect("/supplier/register");
  if (gate.reason === "REJECTED") redirect("/supplier/rejected");
  if (gate.reason === "SUSPENDED") redirect("/supplier/suspended");

  const { supplier } = gate;

  return (
    <SupplierStatusPage
      accent="gold"
      icon={<Clock className="h-7 w-7" />}
      title="Your application is under review"
      message={
        <>
          Thanks for applying, {supplier.companyName}. Our team is reviewing your company profile and will
          verify your account shortly. We'll notify you by email once a decision has been made.
        </>
      }
      detail={{ label: "Typical review time", value: "1–2 business days" }}
    />
  );
}
