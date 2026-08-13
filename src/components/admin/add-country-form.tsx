"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddCountryForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, currencyCode, currencySymbol }),
      });
      if (!res.ok) throw new Error();
      toast.success("Country added as an inactive placeholder");
      setCode(""); setName(""); setCurrencyCode(""); setCurrencySymbol("");
      router.refresh();
    } catch {
      toast.error("Could not add country");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (KW)" maxLength={2} className="input w-24 text-sm" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Country name" className="input text-sm" />
      <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="Currency (KWD)" maxLength={3} className="input w-28 text-sm" />
      <input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} placeholder="Symbol (KD)" className="input w-24 text-sm" />
      <button type="submit" disabled={saving} className="btn-primary !py-2 text-sm">Add (Inactive)</button>
    </form>
  );
}
