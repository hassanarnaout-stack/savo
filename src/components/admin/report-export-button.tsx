"use client";

import { Download } from "lucide-react";

export function ReportExportButton({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  function exportCsv() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const lines = rows.map((row) =>
      headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saveo-${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={exportCsv} disabled={rows.length === 0} className="flex items-center gap-1 text-xs font-semibold text-saveo-emerald-600 disabled:opacity-30">
      <Download className="h-3.5 w-3.5" /> CSV
    </button>
  );
}
