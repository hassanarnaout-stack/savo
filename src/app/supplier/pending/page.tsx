import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { Clock } from "lucide-react";

export default async function SupplierPendingPage() {
  const gate = await getSupplierAccountGate();

  // If they're not actually pending, send them to where they belong instead
  // of showing a stale/incorrect status message.
  if (gate.ok) redirect("/supplier");
  if (gate.reason === "NOT_AUTHENTICATED") redirect("/login?callbackUrl=/supplier/pending");
  if (gate.reason === "WRONG_ROLE") redirect("/");
  if (gate.reason === "NO_SUPPLIER_PROFILE") redirect("/supplier/register");
  if (gate.reason === "REJECTED") redirect("/supplier/rejected");
  if (gate.reason === "SUSPENDED") redirect("/supplier/suspended");

  const { supplier } = gate;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <Clock className="mx-auto h-12 w-12 text-saveo-gold-500" />
      <h1 className="mt-4 text-2xl font-bold text-saveo-emerald-700">Your application is under review</h1>
      <p className="mt-2 text-saveo-emerald-700/60">
        Thanks for applying, {supplier.companyName}. Our team is reviewing your company profile and will
        verify your account shortly. We'll notify you by email once a decision has been made.
      </p>
      <div className="mt-8 rounded-xl2 border border-black/5 bg-white p-4 text-sm text-saveo-emerald-700/60">
        Typical review time: 1–2 business days.
      </div>
    </div>
  );
}
