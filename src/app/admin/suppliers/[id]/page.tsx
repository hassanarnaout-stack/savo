import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SupplierReviewActions } from "@/components/admin/supplier-review-actions";
import { OnboardingChecklist } from "@/components/admin/onboarding-checklist";
import { SupplierLedgerService } from "@/lib/services/supplier-ledger-service";
import { formatKWD } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminSupplierDetailPage({ params }: Props) {
  const { id } = await params;

  const [supplier, ledgerEntries, payable] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, supplierOrders: true } },
        owner: { select: { email: true, createdAt: true } },
        onboardingChecklist: true,
      },
    }),
    SupplierLedgerService.getLedger(id, 20),
    SupplierLedgerService.getPayable(id),
  ]);

  if (!supplier) notFound();

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{supplier.companyName}</h1>
          <p className="text-sm text-saveo-emerald-700/50">Applied {new Date(supplier.createdAt).toLocaleDateString("en-GB")}</p>
        </div>
        <SupplierReviewActions supplierId={supplier.id} status={supplier.status} verificationStatus={supplier.verificationStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-bold">Company Profile</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Contact Name" value={supplier.contactName ?? "—"} />
              <Field label="Email" value={supplier.email} />
              <Field label="Phone" value={supplier.phone} />
              <Field label="Login Email" value={supplier.owner?.email ?? "—"} />
              <Field label="Commercial Registration No." value={supplier.commercialRegistrationNumber ?? "Not provided"} />
              <Field label="Tax Number" value={supplier.taxNumber ?? "Not provided"} />
              <Field label="Website" value={supplier.website ?? "Not provided"} />
              <Field label="Commission Rate" value={`${Number(supplier.commissionRate)}%`} />
            </dl>
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold text-saveo-emerald-700/50">Business Address</p>
              <p className="text-sm text-saveo-emerald-700/80">{supplier.address ?? "Not provided"}</p>
            </div>
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold text-saveo-emerald-700/50">Description</p>
              <p className="text-sm text-saveo-emerald-700/80">{supplier.description ?? "Not provided"}</p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-bold">Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-saveo-emerald-700/50">Account status</span>
                <span className="font-semibold">{supplier.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-saveo-emerald-700/50">Verification</span>
                <span className="font-semibold">{supplier.verificationStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-saveo-emerald-700/50">Terms accepted</span>
                <span className="font-semibold">
                  {supplier.termsAcceptedAt ? new Date(supplier.termsAcceptedAt).toLocaleDateString("en-GB") : "—"}
                </span>
              </div>
            </div>
          </section>

          <OnboardingChecklist
            supplierId={supplier.id}
            initial={{
              companyInfoVerified: supplier.onboardingChecklist?.companyInfoVerified ?? false,
              contactVerified: supplier.onboardingChecklist?.contactVerified ?? false,
              productQualityChecked: supplier.onboardingChecklist?.productQualityChecked ?? false,
              barcodeChecked: supplier.onboardingChecklist?.barcodeChecked ?? false,
              imagesChecked: supplier.onboardingChecklist?.imagesChecked ?? false,
              pricingReviewed: supplier.onboardingChecklist?.pricingReviewed ?? false,
              commissionAgreed: supplier.onboardingChecklist?.commissionAgreed ?? false,
              status: supplier.onboardingChecklist?.status ?? "PENDING_REVIEW",
            }}
          />

          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-bold">Activity</h2>
            <div className="flex justify-between">
              <span className="text-saveo-emerald-700/50">Products listed</span>
              <span className="font-semibold">{supplier._count.products}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-saveo-emerald-700/50">Orders fulfilled</span>
              <span className="font-semibold">{supplier._count.supplierOrders}</span>
            </div>
          </section>

          <section className="card p-5 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Ledger (Payable)</h2>
              <span className={`text-lg font-black ${payable >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>{formatKWD(payable)}</span>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {ledgerEntries.map((entry) => (
                <div key={entry.id} className="flex justify-between text-xs">
                  <span className="text-saveo-emerald-700/60">{entry.type} · {entry.description}</span>
                  <span className={`font-semibold ${Number(entry.amount) >= 0 ? "text-saveo-emerald-700" : "text-red-600"}`}>
                    {formatKWD(Number(entry.amount))}
                  </span>
                </div>
              ))}
              {ledgerEntries.length === 0 && <p className="text-saveo-emerald-700/40">No ledger activity yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-saveo-emerald-700/50">{label}</dt>
      <dd className="text-saveo-emerald-700/90">{value}</dd>
    </div>
  );
}
