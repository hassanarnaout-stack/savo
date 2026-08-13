import { prisma } from "@/lib/prisma";
import { AddCountryForm } from "@/components/admin/add-country-form";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminRegionsPage() {
  const countries = await prisma.country.findMany({
    include: { shippingRules: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Regional Expansion" }]} />
      <h1 className="mb-2 text-2xl font-bold">Regional Expansion</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Foundation only — adding a country here does not activate checkout, pricing, or delivery for it. Kuwait remains the only live market.
      </p>

      <div className="mb-6 card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Add Future Country (Inactive)</h2>
        <AddCountryForm />
      </div>

      <div className="space-y-3">
        {countries.map((c) => (
          <div key={c.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">{c.name} ({c.code}) — {c.currencyCode} {c.currencySymbol}</p>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${c.isActive ? "bg-saveo-emerald-100 text-saveo-emerald-800" : "bg-black/5 text-saveo-emerald-700/50"}`}>
                {c.isActive ? "ACTIVE" : "Inactive placeholder"}
              </span>
            </div>
            {c.shippingRules.length > 0 && (
              <div className="text-xs text-saveo-emerald-700/60">
                {c.shippingRules.map((r) => `${r.zoneName} (${Number(r.baseFee).toFixed(3)} ${c.currencyCode})`).join(" · ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
