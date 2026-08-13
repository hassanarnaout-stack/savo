"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";

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

      // Sign the new supplier in immediately so they can complete their
      // company profile without a second login step.
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
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <Image src="/brand/savo-logo-dark.png" alt="Savo" width={104} height={36} className="mx-auto h-9 w-auto" />
        <h1 className="mt-4 text-2xl font-bold text-saveo-emerald-700">Become a Savo Supplier</h1>
        <p className="mt-1 text-sm text-saveo-emerald-700/60">
          Reach Kuwait's smart-savings shoppers. Step 1 of 2 — your company &amp; account details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl2 border border-black/5 bg-white p-6 shadow-card">
        <Field label="Company Name">
          <input
            required
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="input"
            placeholder="e.g. Sultan Sweets Trading Co."
          />
        </Field>
        <Field label="Contact Name">
          <input
            required
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            className="input"
            placeholder="Who should we reach out to?"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Phone">
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="+965 ..."
            />
          </Field>
        </div>
        <Field label="Password">
          <PasswordInput
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
          />
        </Field>

        <label className="flex items-start gap-2 text-xs text-saveo-emerald-700/70">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 accent-saveo-emerald-700"
          />
          I agree to Savo's Supplier Terms &amp; Commission Policy, and confirm the information above is accurate.
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating your account..." : "Continue to Company Profile"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-saveo-emerald-700/50">
        Already applied? <Link href="/login" className="font-semibold text-saveo-emerald-600">Sign in</Link>
      </p>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
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
