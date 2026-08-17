"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Step = "upload" | "map" | "preview" | "results";

interface RowResult {
  rowNumber: number;
  status: "READY" | "WARNING" | "ERROR";
  messages: string[];
  data: Record<string, any> | null;
}

const IMPORT_FIELD_LABELS: Record<string, string> = {
  sku: "SKU",
  barcode: "Barcode",
  name: "Name (EN)",
  nameAr: "Name (AR)",
  description: "Description (EN)",
  descriptionAr: "Description (AR)",
  brand: "Brand",
  category: "Category (name or slug)",
  saveoPrice: "Saveo Price",
  originalPrice: "Original Price",
  stockQty: "Stock Qty",
  weightGrams: "Weight (grams)",
  type: "Type",
  mainImageUrl: "Main Image URL",
};

/**
 * Product Import Center — shared wizard used by both admin and supplier
 * (only `apiBase` and whether a supplier picker is shown differ).
 * Upload → map columns → validate preview → execute → results.
 * Never imports on upload — always shows a reviewable preview first.
 */
export function ProductImportWizard({ apiBase, suppliers }: { apiBase: string; suppliers?: { id: string; companyName: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<RowResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; ready: number; warning: number; error: number } | null>(null);
  const [executionResult, setExecutionResult] = useState<{ totalRows: number; imported: number; failed: number; failures: { rowNumber: number; error: string }[] } | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiBase}/import/preview`, { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not parse file");
      const data = await res.json();
      setHeaders(data.headers);
      setRows(data.rows);
      setMapping(data.suggestedMapping);
      setStep("map");
    } catch (err: any) {
      toast.error(err.message ?? "Could not parse file");
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/import/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mapping }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Validation failed");
      const data = await res.json();
      setResults(data.results);
      setSummary(data.summary);
      setStep("preview");
    } catch (err: any) {
      toast.error(err.message ?? "Validation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleExecute() {
    if (suppliers && !selectedSupplierId) return toast.error("Select which supplier this catalog belongs to");
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/import/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: results, supplierId: selectedSupplierId || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
      const data = await res.json();
      setExecutionResult(data);
      setStep("results");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold">Import Products</h1>
      <p className="mb-4 text-sm text-saveo-muted">Upload a CSV or XLSX file — you'll review the column mapping and every row before anything is created. Supports up to 5,000 rows per file.</p>

      <a href={`${apiBase}/import/template`} className="mb-6 inline-block rounded border border-saveo-emerald-700/30 px-4 py-2 text-sm font-semibold text-saveo-emerald-700 hover:border-saveo-emerald-700">
        ⬇ Download empty template (.xlsx)
      </a>

      <div className="mb-6 rounded border bg-saveo-emerald-50/40 p-4 text-xs text-saveo-muted">
        <p className="mb-2 font-semibold text-saveo-emerald-700">Required columns</p>
        <p className="mb-3">Name, Description, Category, Original Price, Saveo Price — every row needs these five or it's rejected.</p>
        <p className="mb-2 font-semibold text-saveo-emerald-700">Optional columns</p>
        <table className="mb-3 w-full">
          <tbody>
            <tr><td className="py-0.5 pr-3 font-mono">Name (Arabic)</td><td>Arabic product name</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">Description (Arabic)</td><td>Arabic description</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">Brand</td><td>Shown on the product page</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">SKU</td><td>Your own product code — must be unique across all of SAVO</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">Barcode</td><td>EAN-13 / UPC-A / Code-128 — must be unique across all of SAVO</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">Stock Qty</td><td>Defaults to 0 if left blank</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">Weight (grams)</td><td>Shown in Product Details on the product page</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">Type</td><td>STANDARD, DEAL, MYSTERY_BOX, or RESCUE — defaults to STANDARD</td></tr>
            <tr><td className="py-0.5 pr-3 font-mono">Main Image URL</td><td>A direct link to one square product photo</td></tr>
          </tbody>
        </table>
        <p className="mb-2 font-semibold text-saveo-emerald-700">Dynamic specifications (any category)</p>
        <p>Add your own columns named <code className="font-mono">attribute:Volume</code>, <code className="font-mono">attribute:Fragrance</code>, <code className="font-mono">attribute:Color</code> — anything you need. Add <code className="font-mono">attribute:Volume:ar</code> alongside it for the Arabic label. Each becomes one row in the product's spec table on its page.</p>
      </div>

      {step === "upload" && (
        <div className="rounded border-2 border-dashed p-10 text-center">
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} disabled={busy} />
          <p className="mt-3 text-xs text-saveo-muted">Your column headers can be anything — you'll map them to SAVO's fields on the next screen.</p>
        </div>
      )}

      {step === "map" && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase text-saveo-muted">Map columns ({rows.length} rows found)</h2>
          <table className="mb-4 w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-saveo-muted"><th className="py-2 pr-4">Your Column</th><th className="py-2">Maps To</th></tr></thead>
            <tbody>
              {headers.map((h) => (
                <tr key={h} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{h}</td>
                  <td className="py-2">
                    {h.toLowerCase().startsWith("attribute:") ? (
                      <span className="text-xs text-saveo-emerald-700">Specification: {h.replace(/^attribute:/i, "")}</span>
                    ) : (
                      <select value={mapping[h] ?? ""} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })} className="rounded border px-2 py-1 text-sm">
                        <option value="">— Ignore —</option>
                        {Object.entries(IMPORT_FIELD_LABELS).map(([field, label]) => (
                          <option key={field} value={field}>{label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleValidate} disabled={busy} className="rounded bg-saveo-emerald-700 px-4 py-2 text-sm text-white">{busy ? "Validating…" : "Validate & Preview"}</button>
        </div>
      )}

      {step === "preview" && summary && (
        <div>
          <div className="mb-4 flex gap-4 text-sm">
            <span>{summary.total} rows</span>
            <span className="text-green-700">{summary.ready} ready</span>
            <span className="text-amber-600">{summary.warning} warnings</span>
            <span className="text-red-600">{summary.error} errors</span>
          </div>

          {suppliers && (
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium">This catalog belongs to</label>
              <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="w-full max-w-sm rounded border px-2 py-1.5 text-sm">
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
              </select>
            </div>
          )}

          <table className="mb-4 w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-saveo-muted"><th className="py-2 pr-2">Row</th><th className="py-2 pr-2">Status</th><th className="py-2">Notes</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.rowNumber} className="border-b">
                  <td className="py-2 pr-2">{r.rowNumber}</td>
                  <td className="py-2 pr-2">
                    <span className={r.status === "READY" ? "text-green-700" : r.status === "WARNING" ? "text-amber-600" : "text-red-600"}>{r.status}</span>
                  </td>
                  <td className="py-2 text-xs text-saveo-muted">{r.messages.join("; ") || (r.data ? `${r.data.name}` : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleExecute} disabled={busy || summary.ready + summary.warning === 0} className="rounded bg-saveo-emerald-700 px-4 py-2 text-sm text-white">
            {busy ? "Importing…" : `Import ${summary.ready + summary.warning} products`}
          </button>
        </div>
      )}

      {step === "results" && executionResult && (
        <div>
          <p className="mb-4 text-sm">
            {executionResult.totalRows} rows processed · <span className="text-green-700">{executionResult.imported} imported</span> · <span className="text-red-600">{executionResult.failed} failed</span>
          </p>
          {executionResult.failures.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-saveo-muted"><th className="py-2 pr-2">Row</th><th className="py-2">Error</th></tr></thead>
              <tbody>
                {executionResult.failures.map((f) => (
                  <tr key={f.rowNumber} className="border-b"><td className="py-2 pr-2">{f.rowNumber}</td><td className="py-2 text-xs text-red-600">{f.error}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
