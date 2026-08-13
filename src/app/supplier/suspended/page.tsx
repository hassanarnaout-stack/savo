import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";

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
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
      <h1 className="mt-4 text-2xl font-bold text-saveo-emerald-700">Account suspended</h1>
      <p className="mt-2 text-saveo-emerald-700/60">
        {supplier.companyName}'s Savo supplier account is currently suspended. Please contact our
        supplier team to resolve this and restore access.
      </p>
      <div className="mt-8 rounded-xl2 border border-black/5 bg-white p-4 text-sm text-saveo-emerald-700/60">
        suppliers@saveo.com.kw
      </div>
    </div>
  );
}
