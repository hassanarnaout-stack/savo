"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState("OPERATIONS");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount: parsed, date, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Expense recorded");
      setAmount("");
      setNotes("");
      router.refresh();
    } catch {
      toast.error("Could not record expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input text-sm">
          {["MARKETING", "OPERATIONS", "SALARIES", "TECHNOLOGY", "LOGISTICS", "OTHER"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input type="number" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (KD)" required className="input text-sm" />
      </div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input text-sm" />
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="input text-sm" />
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Add Expense</button>
    </form>
  );
}

export function AddLedgerEntryForm({ suppliers }: { suppliers: { id: string; companyName: string }[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [type, setType] = useState("ADJUSTMENT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!supplierId) return toast.error("Select a supplier");
    if (isNaN(parsed) || parsed === 0) return toast.error("Enter a valid amount");
    if (description.trim().length < 3) return toast.error("Enter a description");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/ledger-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, type, amount: parsed, description }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ledger entry recorded");
      setAmount("");
      setDescription("");
      router.refresh();
    } catch {
      toast.error("Could not record entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className="input text-sm">
        <option value="">Select supplier...</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>{s.companyName}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="input text-sm">
          <option value="REFUND">REFUND</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
          <option value="PAYOUT">PAYOUT</option>
        </select>
        <input type="number" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (± KD)" required className="input text-sm" />
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" required className="input text-sm" />
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Add Entry</button>
    </form>
  );
}
