"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const STEP_TYPES = ["ORIGIN", "MANUFACTURING", "INGREDIENTS", "QUALITY", "CERTIFICATE", "AWARD", "CUSTOM"];
const BADGE_TYPES = ["TRENDING", "LIMITED", "EXCLUSIVE", "SAVEO_PLUS", "AWARD_WINNER", "CHEF_CHOICE", "HEALTHY_CHOICE", "KIDS_FAVORITE", "PREMIUM", "NEW_ARRIVAL", "BEST_SELLER", "EDITORS_PICK"];

export function StoryStepManager({ productId, steps }: { productId: string; steps: { id: string; stepType: string; title: string; content: string }[] }) {
  const router = useRouter();
  const [stepType, setStepType] = useState("ORIGIN");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content) return toast.error("Fill in title and content");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/story-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, stepType, title, content }),
      });
      if (!res.ok) throw new Error();
      toast.success("Step added");
      setTitle(""); setContent("");
      router.refresh();
    } catch {
      toast.error("Could not add step");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/admin/products/story-steps/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not remove step");
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-saveo-emerald-700">📖 Story Mode Steps</h2>
      <div className="mb-3 space-y-1.5">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs">
            <span><strong>{s.stepType}</strong>: {s.title}</span>
            <button onClick={() => remove(s.id)} aria-label="Remove"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="space-y-2">
        <select value={stepType} onChange={(e) => setStepType(e.target.value)} className="input text-sm">
          {STEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Step title" className="input text-sm" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Step content" rows={2} className="input text-sm" />
        <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Add Step</button>
      </form>
    </div>
  );
}

export function IngredientManager({ productId, ingredients }: { productId: string; ingredients: { id: string; name: string; isAllergen: boolean }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [benefit, setBenefit] = useState("");
  const [isAllergen, setIsAllergen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return toast.error("Enter an ingredient name");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, name, origin: origin || undefined, benefit: benefit || undefined, isAllergen }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ingredient added");
      setName(""); setOrigin(""); setBenefit(""); setIsAllergen(false);
      router.refresh();
    } catch {
      toast.error("Could not add ingredient");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/admin/products/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not remove ingredient");
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-saveo-emerald-700">🌿 Ingredients</h2>
      <div className="mb-3 space-y-1.5">
        {ingredients.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs">
            <span>{i.name} {i.isAllergen && "⚠️"}</span>
            <button onClick={() => remove(i.id)} aria-label="Remove"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ingredient name" className="input text-sm" />
        <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origin (optional)" className="input text-sm" />
        <input value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder="Benefit (optional)" className="input text-sm" />
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={isAllergen} onChange={(e) => setIsAllergen(e.target.checked)} /> Contains allergen
        </label>
        <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Add Ingredient</button>
      </form>
    </div>
  );
}

export function NutritionManager({ productId, existing }: { productId: string; existing: Record<string, any> | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    servingSize: existing?.servingSize ?? "",
    calories: existing?.calories?.toString() ?? "",
    proteinG: existing?.proteinG?.toString() ?? "",
    carbsG: existing?.carbsG?.toString() ?? "",
    sugarG: existing?.sugarG?.toString() ?? "",
    fatG: existing?.fatG?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          servingSize: form.servingSize || undefined,
          calories: form.calories ? parseFloat(form.calories) : undefined,
          proteinG: form.proteinG ? parseFloat(form.proteinG) : undefined,
          carbsG: form.carbsG ? parseFloat(form.carbsG) : undefined,
          sugarG: form.sugarG ? parseFloat(form.sugarG) : undefined,
          fatG: form.fatG ? parseFloat(form.fatG) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Nutrition facts saved");
      router.refresh();
    } catch {
      toast.error("Could not save nutrition facts");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-saveo-emerald-700">📊 Nutrition Facts</h2>
      <form onSubmit={save} className="grid grid-cols-2 gap-2">
        <input value={form.servingSize} onChange={(e) => setForm({ ...form, servingSize: e.target.value })} placeholder="Serving size (30g)" className="input text-sm" />
        <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder="Calories" className="input text-sm" />
        <input type="number" step="0.1" value={form.proteinG} onChange={(e) => setForm({ ...form, proteinG: e.target.value })} placeholder="Protein (g)" className="input text-sm" />
        <input type="number" step="0.1" value={form.carbsG} onChange={(e) => setForm({ ...form, carbsG: e.target.value })} placeholder="Carbs (g)" className="input text-sm" />
        <input type="number" step="0.1" value={form.sugarG} onChange={(e) => setForm({ ...form, sugarG: e.target.value })} placeholder="Sugar (g)" className="input text-sm" />
        <input type="number" step="0.1" value={form.fatG} onChange={(e) => setForm({ ...form, fatG: e.target.value })} placeholder="Fat (g)" className="input text-sm" />
        <button type="submit" disabled={saving} className="btn-primary col-span-2 text-sm">Save Nutrition Facts</button>
      </form>
    </div>
  );
}

export function BadgeManager({ productId, activeBadges }: { productId: string; activeBadges: string[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(type: string, isActive: boolean) {
    setSaving(type);
    try {
      const res = await fetch("/api/admin/products/badges", {
        method: isActive ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, type }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update badge");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-saveo-emerald-700">🏅 Manual Badges</h2>
      <div className="flex flex-wrap gap-1.5">
        {BADGE_TYPES.map((type) => {
          const active = activeBadges.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggle(type, active)}
              disabled={saving === type}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${active ? "bg-saveo-emerald-600 text-white" : "bg-black/5 text-saveo-emerald-700/60"}`}
            >
              {type.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const FLAVOR_AXES = ["sweetness", "sourness", "bitterness", "saltiness", "spiciness", "richness"] as const;

export function FlavorManager({ productId, existing }: { productId: string; existing: Record<string, any> | null }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(FLAVOR_AXES.map((k) => [k, existing?.[k] ?? 0]))
  );
  const [firstTasteNote, setFirstTasteNote] = useState(existing?.firstTasteNote ?? "");
  const [midTasteNote, setMidTasteNote] = useState(existing?.midTasteNote ?? "");
  const [finishNote, setFinishNote] = useState(existing?.finishNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/flavor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...scores, firstTasteNote: firstTasteNote || undefined, midTasteNote: midTasteNote || undefined, finishNote: finishNote || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Flavor profile saved");
      router.refresh();
    } catch {
      toast.error("Could not save flavor profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-saveo-emerald-700">👅 Flavor Journey</h2>
      <form onSubmit={save} className="space-y-3">
        {FLAVOR_AXES.map((axis) => (
          <div key={axis}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="capitalize">{axis}</span>
              <span className="font-semibold">{scores[axis]}/5</span>
            </div>
            <input
              type="range" min="0" max="5" step="1"
              value={scores[axis]}
              onChange={(e) => setScores({ ...scores, [axis]: parseInt(e.target.value, 10) })}
              className="w-full"
            />
          </div>
        ))}
        <input value={firstTasteNote} onChange={(e) => setFirstTasteNote(e.target.value)} placeholder="First taste note" className="input text-sm" />
        <input value={midTasteNote} onChange={(e) => setMidTasteNote(e.target.value)} placeholder="Mid palate note" className="input text-sm" />
        <input value={finishNote} onChange={(e) => setFinishNote(e.target.value)} placeholder="Finish note" className="input text-sm" />
        <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Save Flavor Profile</button>
      </form>
    </div>
  );
}
