"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Two explicit, visually distinct actions — dry run (safe, default)
 * and execute (real writes, requires confirmation) — never one button
 * that could accidentally execute. */
export function BrandBackfillControl() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);

  async function run(dryRun: boolean) {
    if (!dryRun && !confirm("This will create real Brand records and link products. Continue?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/catalog-brands/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Backfill failed");
      setReport(data);
      if (!dryRun) {
        toast.success(`Created ${data.brandsCreated} brands, linked ${data.productsLinked} products`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Backfill failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded border p-4">
      <h2 className="mb-1 text-sm font-bold uppercase text-saveo-muted">Backfill from Product.brandName</h2>
      <p className="mb-3 text-xs text-saveo-muted">Creates a Brand record for every distinct existing brandName value and links matching products. brandName itself is never changed. Always run Dry Run first.</p>
      <div className="mb-3 flex gap-2">
        <button onClick={() => run(true)} disabled={busy} className="rounded border px-4 py-1.5 text-sm">Dry Run</button>
        <button onClick={() => run(false)} disabled={busy} className="rounded bg-saveo-emerald-700 px-4 py-1.5 text-sm text-white">Execute</button>
      </div>
      {report && (
        <div className="rounded bg-saveo-emerald-50/40 p-3 text-xs">
          <p>Scanned: {report.totalScanned} · Without brand: {report.withoutBrand} · Distinct brand names: {report.distinctBrandNames}</p>
          {report.dryRun ? (
            <p>New brands to create: {report.newBrandsToCreate} · Already existing: {report.alreadyExisting}</p>
          ) : (
            <p>Brands created: {report.brandsCreated} · Products linked: {report.productsLinked} · Errors: {report.errors?.length ?? 0}</p>
          )}
        </div>
      )}
    </div>
  );
}
