import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { AccountMessagesClient } from "@/components/messaging/account-messages-client";

export default async function SupplierMessagesPage() {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/messages");
      case "WRONG_ROLE":
        redirect("/");
      case "NO_SUPPLIER_PROFILE":
        redirect("/supplier/register");
      case "PENDING":
        redirect("/supplier/pending");
      case "REJECTED":
        redirect("/supplier/rejected");
      case "SUSPENDED":
        redirect("/supplier/suspended");
    }
  }
  const { supplier } = gate;
  if (!supplier.ownerUserId) redirect("/supplier/register");

  return <AccountMessagesClient currentUserId={supplier.ownerUserId} />;
}
