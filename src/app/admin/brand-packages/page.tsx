import { prisma } from "@/lib/prisma";
import { PackageEditControls } from "@/components/admin/package-edit-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminBrandPackagesPage() {
  const packages = await prisma.brandPackage.findMany({ orderBy: { monthlyPrice: "asc" } });

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Brands", href: "/admin/brands" }, { label: "Packages" }]} />
      <h1 className="mb-2 text-2xl font-bold">Brand Packages</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Manage the paid tiers brand partners can subscribe to — pricing and features are fully admin-editable here.
      </p>

      <div className="space-y-3">
        {packages.map((pkg) => (
          <div key={pkg.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-bold">{pkg.name} <span className="text-xs font-normal text-saveo-emerald-700/40">({pkg.type})</span></p>
                <p className="text-xs text-saveo-emerald-700/50">{pkg.description}</p>
              </div>
            </div>
            <PackageEditControls
              packageId={pkg.id}
              monthlyPrice={Number(pkg.monthlyPrice)}
              active={pkg.active}
              features={pkg.features as any}
            />
          </div>
        ))}
        {packages.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No packages yet — run the seed script.
          </div>
        )}
      </div>
    </div>
  );
}
