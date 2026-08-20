"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProfileValues {
  logo: string;
  description: string;
  address: string;
  commercialRegistrationNumber: string;
  taxNumber: string;
  website: string;
}

export function SupplierProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/supplier/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Profile submitted for review!");
      router.push("/supplier/pending");
    } catch {
      toast.error("Could not save your profile. Please check the required fields.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="savo-supplier-onboard-card">
      <SupplierField label="Logo URL (optional)">
        <input
          value={form.logo}
          onChange={(e) => setForm({ ...form, logo: e.target.value })}
          className="savo-supplier-input"
          placeholder="https://..."
        />
      </SupplierField>
      <SupplierField label="Company Description">
        <textarea
          required
          minLength={10}
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="savo-supplier-input"
          placeholder="What do you sell, and what makes your business a good fit for Savo?"
        />
      </SupplierField>
      <SupplierField label="Business Address">
        <textarea
          required
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="savo-supplier-input"
          placeholder="Warehouse / office address in Kuwait"
        />
      </SupplierField>
      <div className="savo-supplier-onboard-grid">
        <SupplierField label="Commercial Registration No. (optional)">
          <input
            value={form.commercialRegistrationNumber}
            onChange={(e) => setForm({ ...form, commercialRegistrationNumber: e.target.value })}
            className="savo-supplier-input"
          />
        </SupplierField>
        <SupplierField label="Tax Number (optional)">
          <input
            value={form.taxNumber}
            onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
            className="savo-supplier-input"
          />
        </SupplierField>
      </div>
      <SupplierField label="Website (optional)">
        <input
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="savo-supplier-input"
          placeholder="https://..."
        />
      </SupplierField>

      <button type="submit" disabled={submitting} className="savo-supplier-onboard-cta">
        {submitting ? "Submitting..." : "Submit for Review"}
      </button>
    </form>
  );
}

function SupplierField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="savo-supplier-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
