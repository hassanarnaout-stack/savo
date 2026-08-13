import { prisma } from "@/lib/prisma";
import { formatKWD } from "@/lib/utils";
import { BrandStatusControls } from "@/components/admin/brand-status-controls";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminBrandsPage() {
  const brands = await prisma.brandAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      invoices: { where: { status: "PAID" }, select: { amount: true } },
      campaigns: { select: { id: true, status: true } },
    },
  });

  const totalRevenue = brands.reduce((sum, b) => sum + b.invoices.reduce((s, i) => s + Number(i.amount), 0), 0);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Brands" }]} />
      <h1 className="mb-2 text-2xl font-bold">Brand Management</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Total brand revenue (paid invoices): <strong>{formatKWD(totalRevenue)}</strong> ·{" "}
        <a href="/admin/brands/revenue" className="font-semibold text-saveo-emerald-600 hover:underline">View full revenue dashboard →</a>
      </p>

      <div className="space-y-3">
        {brands.map((brand) => {
          const brandRevenue = brand.invoices.reduce((s, i) => s + Number(i.amount), 0);
          const activeCampaigns = brand.campaigns.filter((c) => c.status === "ACTIVE").length;
          return (
            <div key={brand.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-black/5 bg-white p-4">
              <div>
                <p className="font-semibold">{brand.companyName}</p>
                <p className="text-xs text-saveo-emerald-700/50">
                  {brand.contactName} · {brand.email} · {activeCampaigns} active campaigns · Revenue {formatKWD(brandRevenue)}
                </p>
              </div>
              <BrandStatusControls brandId={brand.id} status={brand.status} />
            </div>
          );
        })}
        {brands.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No brand accounts yet.
          </div>
        )}
      </div>
    </div>
  );
}
