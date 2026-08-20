"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { SupplierStepIndicator } from "@/components/supplier/supplier-step-indicator";
import { SAVOLogo } from "@/components/brand/savo-master-logo";

export default function SupplierRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("Please accept the Supplier Terms to continue.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/supplier/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, acceptedTerms: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Registration failed");
      }

      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (signInRes?.error) {
        toast.success("Account created — please sign in to continue.");
        router.push("/login");
        return;
      }

      router.push("/supplier/register/profile");
    } catch (err: any) {
      toast.error(err.message ?? "Could not create your supplier account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="savo-supplier-onboard-page">
      <div className="savo-supplier-onboard-glow" />
      <p className="savo-supplier-onboard-topright">
        Already applied? <Link href="/login" className="savo-supplier-onboard-link">Sign in</Link>
      </p>
      <div className="savo-supplier-onboard-wrap">
        <div className="savo-supplier-onboard-header">
          <SAVOLogo variant="primary-light" style={{ height: 30, width: "auto" }} className="savo-supplier-onboard-logo" />
          <SupplierStepIndicator currentStep={1} />
          <h1 className="savo-supplier-onboard-title">Become a Savo Supplier</h1>
          <p className="savo-supplier-onboard-sub">Reach Kuwait's smart-savings shoppers. Step 1 of 2 — your company &amp; account details.</p>
        </div>

        <form onSubmit={handleSubmit} className="savo-supplier-onboard-card">
          <SupplierField label="Company Name">
            <input
              required
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="savo-supplier-input"
              placeholder="e.g. Sultan Sweets Trading Co."
            />
          </SupplierField>
          <SupplierField label="Contact Name">
            <input
              required
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="savo-supplier-input"
              placeholder="Who should we reach out to?"
            />
          </SupplierField>
          <div className="savo-supplier-onboard-grid">
            <SupplierField label="Email">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="savo-supplier-input"
              />
            </SupplierField>
            <SupplierField label="Phone">
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="savo-supplier-input"
                placeholder="+965 ..."
              />
            </SupplierField>
          </div>
          <SupplierField label="Password">
            <PasswordInput
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="savo-supplier-input"
            />
          </SupplierField>

          <label className="savo-supplier-onboard-terms">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="savo-supplier-onboard-checkbox" />
            I agree to Savo's Supplier Terms &amp; Commission Policy, and confirm the information above is accurate.
          </label>

          <button type="submit" disabled={loading} className="savo-supplier-onboard-cta">
            {loading ? "Creating your account..." : "Continue to Company Profile"}
          </button>
        </form>
      </div>
    </div>
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

