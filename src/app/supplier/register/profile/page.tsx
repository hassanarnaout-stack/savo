import { redirect } from "next/navigation";
import Image from "next/image";
import { requireSupplier } from "@/lib/auth";
import { SupplierProfileForm } from "@/components/supplier/profile-form";
import { SupplierStepIndicator } from "@/components/supplier/supplier-step-indicator";

export default async function SupplierProfilePage() {
  let supplier;
  try {
    ({ supplier } = await requireSupplier());
  } catch {
    redirect("/login?callbackUrl=/supplier/register/profile");
  }

  return (
    <div className="savo-supplier-onboard-page">
      <div className="savo-supplier-onboard-glow" />
      <div className="savo-supplier-onboard-wrap">
        <div className="savo-supplier-onboard-header">
          <Image src="/brand/savo-logo-dark.png" alt="Savo" width={104} height={36} className="savo-supplier-onboard-logo" />
          <SupplierStepIndicator currentStep={2} />
          <h1 className="savo-supplier-onboard-title">Complete Your Company Profile</h1>
          <p className="savo-supplier-onboard-sub">Step 2 of 2 — {supplier.companyName}. This helps our team verify your business.</p>
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
    </div>
  );
}
