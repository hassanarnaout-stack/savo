"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Shortcut {
  id: string;
  destinationKey: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

interface Destination {
  key: string;
  labelEn: string;
}

/** Admin CRUD for Discover's Quick Ways In. Real API calls, real
 * per-row state — no mock rows. destinationKey is always chosen from
 * the closed dropdown (Destination[] passed in), never typed freely. */
export function QuickWayShortcutControls({ shortcuts, destinations }: { shortcuts: Shortcut[]; destinations: Destination[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState({ destinationKey: destinations[0]?.key ?? "", labelEn: "", labelAr: "", icon: "Sparkles", sortOrder: shortcuts.length });

  async function toggleActive(s: Shortcut) {
    setSaving(s.id);
    try {
      const res = await fetch(`/api/admin/quick-way-shortcuts/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update");
    } finally {
      setSaving(null);
    }
  }

  async function updateOrder(s: Shortcut, sortOrder: number) {
    setSaving(s.id);
    try {
      const res = await fetch(`/api/admin/quick-way-shortcuts/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update order");
    } finally {
      setSaving(null);
    }
  }

  async function remove(s: Shortcut) {
    if (!confirm(`Delete "${s.labelEn}"?`)) return;
    setSaving(s.id);
    try {
      const res = await fetch(`/api/admin/quick-way-shortcuts/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete");
    } finally {
      setSaving(null);
    }
  }

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    if (!newRow.labelEn.trim() || !newRow.labelAr.trim()) return toast.error("Enter both labels");
    setSaving("new");
    try {
      const res = await fetch("/api/admin/quick-way-shortcuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not create");
      toast.success("Added");
      setShowAdd(false);
      setNewRow({ destinationKey: destinations[0]?.key ?? "", labelEn: "", labelAr: "", icon: "Sparkles", sortOrder: shortcuts.length });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not create");
    } finally {
      setSaving(null);
    }
  }

  const activeCount = shortcuts.filter((s) => s.isActive).length;

  return (
    <div>
      <div className="mb-4 text-sm">
        <strong>{activeCount}</strong> active {activeCount === 1 ? "shortcut" : "shortcuts"}
        {activeCount > 8 && <span className="text-red-600"> — only the first 8 (by order) will show on Discover</span>}
      </div>

      <table className="w-full text-sm border-collapse mb-4">
        <thead>
          <tr className="border-b text-left text-xs text-saveo-muted uppercase">
            <th className="py-2 pr-2">Order</th>
            <th className="py-2 pr-2">Active</th>
            <th className="py-2 pr-2">Label (EN)</th>
            <th className="py-2 pr-2">Label (AR)</th>
            <th className="py-2 pr-2">Destination</th>
            <th className="py-2 pr-2">Icon</th>
            <th className="py-2 pr-2" />
          </tr>
        </thead>
        <tbody>
          {shortcuts.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2 pr-2">
                <input
                  type="number"
                  defaultValue={s.sortOrder}
                  onBlur={(e) => updateOrder(s, parseInt(e.target.value, 10) || 0)}
                  className="w-14 border rounded px-1.5 py-1"
                  disabled={saving === s.id}
                />
              </td>
              <td className="py-2 pr-2">
                <input type="checkbox" checked={s.isActive} onChange={() => toggleActive(s)} disabled={saving === s.id} />
              </td>
              <td className="py-2 pr-2">{s.labelEn}</td>
              <td className="py-2 pr-2" dir="rtl">{s.labelAr}</td>
              <td className="py-2 pr-2 text-xs">{s.destinationKey}</td>
              <td className="py-2 pr-2 text-xs">{s.icon}</td>
              <td className="py-2 pr-2">
                <button onClick={() => remove(s)} disabled={saving === s.id} className="text-red-600 text-xs">Delete</button>
              </td>
            </tr>
          ))}
          {shortcuts.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center text-saveo-muted">No shortcuts configured — Quick Ways In is hidden on Discover.</td></tr>
          )}
        </tbody>
      </table>

      {showAdd ? (
        <form onSubmit={addRow} className="border rounded p-4 space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium mb-1">Destination</label>
            <select value={newRow.destinationKey} onChange={(e) => setNewRow({ ...newRow, destinationKey: e.target.value })} className="w-full border rounded px-2 py-1.5">
              {destinations.map((d) => <option key={d.key} value={d.key}>{d.labelEn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Label (English)</label>
            <input value={newRow.labelEn} onChange={(e) => setNewRow({ ...newRow, labelEn: e.target.value })} className="w-full border rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Label (Arabic)</label>
            <input value={newRow.labelAr} onChange={(e) => setNewRow({ ...newRow, labelAr: e.target.value })} dir="rtl" className="w-full border rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Icon (Lucide name, e.g. Sparkles, Gift, Crown, Zap)</label>
            <input value={newRow.icon} onChange={(e) => setNewRow({ ...newRow, icon: e.target.value })} className="w-full border rounded px-2 py-1.5" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving === "new"} className="bg-saveo-emerald-700 text-white px-4 py-1.5 rounded text-sm">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-1.5 rounded text-sm border">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)} className="bg-saveo-emerald-700 text-white px-4 py-2 rounded text-sm">+ Add Shortcut</button>
      )}
    </div>
  );
}
