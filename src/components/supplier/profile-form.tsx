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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl2 border border-black/5 bg-white p-6 shadow-card">
      <Field label="Logo URL (optional)">
        <input
          value={form.logo}
          onChange={(e) => setForm({ ...form, logo: e.target.value })}
          className="input"
          placeholder="https://..."
        />
      </Field>
      <Field label="Company Description">
        <textarea
          required
          minLength={10}
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          placeholder="What do you sell, and what makes your business a good fit for Savo?"
        />
      </Field>
      <Field label="Business Address">
        <textarea
          required
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="input"
          placeholder="Warehouse / office address in Kuwait"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Commercial Registration No. (optional)">
          <input
            value={form.commercialRegistrationNumber}
            onChange={(e) => setForm({ ...form, commercialRegistrationNumber: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Tax Number (optional)">
          <input
            value={form.taxNumber}
            onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
            className="input"
          />
        </Field>
      </div>
      <Field label="Website (optional)">
        <input
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="input"
          placeholder="https://..."
        />
      </Field>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Submitting..." : "Submit for Review"}
      </button>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">{label}</label>
      {children}
    </div>
  );
}
