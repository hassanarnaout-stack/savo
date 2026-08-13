import { redirect } from "next/navigation";
import Image from "next/image";
import { requireSupplier } from "@/lib/auth";
import { SupplierProfileForm } from "@/components/supplier/profile-form";

export default async function SupplierProfilePage() {
  let supplier;
  try {
    ({ supplier } = await requireSupplier());
  } catch {
    redirect("/login?callbackUrl=/supplier/register/profile");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <Image src="/brand/savo-logo-dark.png" alt="Savo" width={104} height={36} className="mx-auto h-9 w-auto" />
        <h1 className="mt-4 text-2xl font-bold text-saveo-emerald-700">Complete Your Company Profile</h1>
        <p className="mt-1 text-sm text-saveo-emerald-700/60">
          Step 2 of 2 — {supplier.companyName}. This helps our team verify your business.
        </p>
      </div>

      <SupplierProfileForm
        initial={{
          logo: supplier.logo ?? "",
          description: supplier.description ?? "",
          address: supplier.address ?? "",
          commercialRegistrationNumber: supplier.commercialRegistrationNumber ?? "",
          taxNumber: supplier.taxNumber ?? "",
          website: supplier.website ?? "",
        }}
      />
    </div>
  );
}
