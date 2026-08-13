"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function BrandRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/brand/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit registration");
      toast.success("Registration submitted — awaiting admin approval");
      router.push("/brand");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not submit registration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto max-w-lg space-y-3 p-6">
      <h1 className="text-xl font-bold text-saveo-emerald-700">Register Your Brand</h1>
      <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Company name" className="input" />
      <input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Contact name" className="input" />
      <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="input" />
      <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="input" />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="About your brand (optional)" className="input" rows={3} />
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Submitting..." : "Submit for Approval"}
      </button>
    </form>
  );
}
