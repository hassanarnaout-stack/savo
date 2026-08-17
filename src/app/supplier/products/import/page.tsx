import { redirect } from "next/navigation";
import { getSupplierAccountGate } from "@/lib/auth";
import { ProductImportWizard } from "@/components/admin/product-import-wizard";

export default async function SupplierProductImportPage() {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/products/import");
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* No supplier picker — every imported product is automatically
          attributed to the authenticated supplier, server-side. */}
      <ProductImportWizard apiBase="/api/supplier/products" />
    </div>
  );
}
