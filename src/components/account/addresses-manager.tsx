"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  governorate: string;
  area: string;
  block: string | null;
  street: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  avenue: string | null;
  notes: string | null;
  isDefault: boolean;
}

const GOVERNORATES = ["Al Asimah", "Hawalli", "Farwaniya", "Mubarak Al-Kabeer", "Ahmadi", "Jahra"];

function formatAddressLine(a: Address, isArabic: boolean): string {
  const parts = [a.area, a.block ? `Block ${a.block}` : null, a.street, a.avenue, a.building ? `Building ${a.building}` : null, a.floor ? `Floor ${a.floor}` : null, a.apartment ? `Apt ${a.apartment}` : null]
    .filter(Boolean);
  return `${a.governorate}, ${parts.join(", ")}`;
}

function AddressFormFields({ form, setForm, isArabic }: { form: any; setForm: (f: any) => void; isArabic: boolean }) {
  return (
    <div className="savo-addr-form-grid">
      <input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={isArabic ? "التسمية (مثل: المنزل)" : "Label (e.g. Home)"} className="savo-addr-input" />
      <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder={isArabic ? "الاسم الكامل" : "Full name"} required className="savo-addr-input" />
      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={isArabic ? "الهاتف" : "Phone"} required className="savo-addr-input" />
      <select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="savo-addr-input">
        {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder={isArabic ? "المنطقة" : "Area"} required className="savo-addr-input" />
      <input value={form.block ?? ""} onChange={(e) => setForm({ ...form, block: e.target.value })} placeholder={isArabic ? "القطعة" : "Block"} className="savo-addr-input" />
      <input value={form.street ?? ""} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder={isArabic ? "الشارع" : "Street"} className="savo-addr-input" />
      <input value={form.building ?? ""} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder={isArabic ? "المبنى" : "Building"} className="savo-addr-input" />
      <input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={isArabic ? "ملاحظات" : "Notes"} className="savo-addr-input savo-addr-input--wide" />
    </div>
  );
}

export function AddressesManager({ addresses, isArabic }: { addresses: Address[]; isArabic: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setForm({ fullName: "", phone: "", governorate: GOVERNORATES[0], area: "" });
    setEditing("new");
  }
  function openEdit(a: Address) {
    setForm({ ...a });
    setEditing(a);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === "new") {
        const res = await fetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      } else if (editing) {
        const res = await fetch(`/api/addresses/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      }
      toast.success(isArabic ? "تم الحفظ" : "Saved");
      setEditing(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || (isArabic ? "تعذّر الحفظ" : "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/addresses/${id}/default`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error(isArabic ? "تعذّر التحديث" : "Could not update");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(isArabic ? "حذف هذا العنوان؟" : "Delete this address?")) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(isArabic ? "تم الحذف" : "Deleted");
      router.refresh();
    } catch {
      toast.error(isArabic ? "تعذّر الحذف" : "Could not delete");
    }
  }

  return (
    <div>
      <div className="savo-addr-header">
        <h1 className="savo-addr-title">{isArabic ? "العناوين" : "Addresses"}</h1>
        <button onClick={openAdd} className="savo-addr-add-btn">+ {isArabic ? "إضافة عنوان" : "Add address"}</button>
      </div>

      {addresses.length === 0 ? (
        <p className="savo-addr-empty">{isArabic ? "صفر عناوين محفوظة بعد." : "No saved addresses yet."}</p>
      ) : (
        <div className="savo-addr-list">
          {addresses.map((a) => (
            <div key={a.id} className={`savo-addr-card ${a.isDefault ? "is-default" : ""}`}>
              <div>
                <div className="savo-addr-card-head">
                  <span className="savo-addr-name">{a.label || a.fullName}</span>
                  {a.isDefault && <span className="savo-addr-badge">{isArabic ? "الافتراضي" : "Default"}</span>}
                </div>
                <p className="savo-addr-line">{formatAddressLine(a, isArabic)}</p>
                <p className="savo-addr-phone">{a.fullName} · {a.phone}</p>
              </div>
              <div className="savo-addr-actions">
                {!a.isDefault && <button onClick={() => handleSetDefault(a.id)} className="savo-addr-action">{isArabic ? "تعيين كافتراضي" : "Set as default"}</button>}
                <button onClick={() => openEdit(a)} className="savo-addr-action">{isArabic ? "تعديل" : "Edit"}</button>
                <button onClick={() => handleDelete(a.id)} className="savo-addr-action savo-addr-action--danger">{isArabic ? "حذف" : "Delete"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="savo-addr-modal-backdrop" onClick={() => setEditing(null)}>
          <form onSubmit={handleSave} className="savo-addr-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="savo-addr-modal-title">{editing === "new" ? (isArabic ? "إضافة عنوان" : "Add Address") : (isArabic ? "تعديل العنوان" : "Edit Address")}</h2>
            <AddressFormFields form={form} setForm={setForm} isArabic={isArabic} />
            <div className="savo-addr-modal-actions">
              <button type="button" onClick={() => setEditing(null)} className="savo-addr-modal-cancel">{isArabic ? "إلغاء" : "Cancel"}</button>
              <button type="submit" disabled={saving} className="savo-addr-modal-save">{saving ? "..." : isArabic ? "حفظ" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
