"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface RewardPoolItem {
  type: string;
  label: string;
  value: number | null;
  weight: number;
}

interface TreasureMapNode {
  id: string;
  category: string;
  task: string;
  reward: { type: string; label: string; value: number | null };
  order: number;
}

const REWARD_TYPES = ["DISCOUNT", "FREE_DELIVERY", "POINTS", "CREDIT", "MYSTERY_BOX", "GOLDEN_TICKET"];

/** Reward pool editor for Treasure Chest / Mystery Safe — weights are relative, shown as a live-computed % of the total so the admin sees real odds, not raw numbers. */
function RewardPoolEditor({ campaignId, initialPool }: { campaignId: string; initialPool: RewardPoolItem[] }) {
  const [pool, setPool] = useState<RewardPoolItem[]>(initialPool);
  const [saving, setSaving] = useState(false);
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);

  function update(index: number, field: keyof RewardPoolItem, value: string) {
    setPool((prev) => prev.map((item, i) => i === index ? { ...item, [field]: field === "weight" || field === "value" ? (value === "" ? null : Number(value)) : value } : item));
  }

  function addItem() {
    setPool((prev) => [...prev, { type: "DISCOUNT", label: "New Reward", value: null, weight: 10 }]);
  }

  function removeItem(index: number) {
    setPool((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { rewardPool: pool } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Reward pool saved");
    } catch {
      toast.error("Could not save reward pool");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {pool.map((item, i) => {
        const oddsPercent = totalWeight > 0 ? ((item.weight / totalWeight) * 100).toFixed(1) : "0";
        return (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-black/5 p-3 sm:grid-cols-6">
            <select value={item.type} onChange={(e) => update(i, "type", e.target.value)} className="input text-xs">
              {REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={item.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Label" className="input text-xs sm:col-span-2" />
            <input type="number" value={item.value ?? ""} onChange={(e) => update(i, "value", e.target.value)} placeholder="Value" className="input text-xs" />
            <input type="number" value={item.weight} onChange={(e) => update(i, "weight", e.target.value)} placeholder="Weight" className="input text-xs" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-saveo-gold-600">{oddsPercent}%</span>
              <button onClick={() => removeItem(i)} aria-label="Remove"><Trash2 className="h-4 w-4 text-red-500" /></button>
            </div>
          </div>
        );
      })}
      <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-semibold text-saveo-emerald-600">
        <Plus className="h-4 w-4" /> Add Reward
      </button>
      <p className="text-[11px] text-saveo-emerald-700/40">Weight is relative — the % column shows the real, live-computed odds of winning each reward based on current weights.</p>
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
        <Save className="h-4 w-4" /> Save Reward Pool
      </button>
    </div>
  );
}

/** Golden Ticket editor — a single odds number (1-in-N orders) plus the reward it grants. */
function GoldenTicketEditor({ campaignId, initialOdds, initialReward }: { campaignId: string; initialOdds: number; initialReward: { label: string; type: string } }) {
  const [odds, setOdds] = useState(initialOdds);
  const [rewardLabel, setRewardLabel] = useState(initialReward.label);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { odds, reward: { ...initialReward, label: rewardLabel } } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Golden Ticket settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/70">Win odds — 1 in every N orders</label>
        <input type="number" min={1} value={odds} onChange={(e) => setOdds(Number(e.target.value))} className="input text-sm" />
        <p className="mt-1 text-[11px] text-saveo-emerald-700/40">Real computed win rate: {odds > 0 ? (100 / odds).toFixed(2) : "0"}% of orders</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/70">Reward label</label>
        <input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} className="input text-sm" />
      </div>
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

/** Treasure Map editor — each stage's task description and reward. */
function TreasureMapEditor({ campaignId, initialNodes }: { campaignId: string; initialNodes: TreasureMapNode[] }) {
  const [nodes, setNodes] = useState<TreasureMapNode[]>(initialNodes);
  const [saving, setSaving] = useState(false);

  function updateNode(index: number, field: string, value: string) {
    setNodes((prev) => prev.map((n, i) => {
      if (i !== index) return n;
      if (field === "rewardLabel") return { ...n, reward: { ...n.reward, label: value } };
      if (field === "rewardValue") return { ...n, reward: { ...n.reward, value: value === "" ? null : Number(value) } };
      return { ...n, [field]: value };
    }));
  }

  function addNode() {
    setNodes((prev) => [...prev, { id: `node-${prev.length + 1}`, category: "", task: "New task", reward: { type: "POINTS", label: "New reward", value: 10 }, order: prev.length + 1 }]);
  }

  function removeNode(index: number) {
    setNodes((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { nodes } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Treasure Map stages saved");
    } catch {
      toast.error("Could not save stages");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {nodes.map((node, i) => (
        <div key={node.id} className="space-y-2 rounded-lg border border-black/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-saveo-emerald-700">Stage {i + 1}</span>
            <button onClick={() => removeNode(i)} aria-label="Remove"><Trash2 className="h-4 w-4 text-red-500" /></button>
          </div>
          <input value={node.category} onChange={(e) => updateNode(i, "category", e.target.value)} placeholder="Category slug" className="input text-xs" />
          <input value={node.task} onChange={(e) => updateNode(i, "task", e.target.value)} placeholder="Task description" className="input text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input value={node.reward.label} onChange={(e) => updateNode(i, "rewardLabel", e.target.value)} placeholder="Reward label" className="input text-xs" />
            <input type="number" value={node.reward.value ?? ""} onChange={(e) => updateNode(i, "rewardValue", e.target.value)} placeholder="Reward value" className="input text-xs" />
          </div>
        </div>
      ))}
      <button onClick={addNode} className="flex items-center gap-1.5 text-xs font-semibold text-saveo-emerald-600">
        <Plus className="h-4 w-4" /> Add Stage
      </button>
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
        <Save className="h-4 w-4" /> Save Stages
      </button>
    </div>
  );
}

/** Limited Time Hunt editor — max winners and the reward they get, per the real config shape in limited-time-hunt-service.ts. */
function LimitedTimeHuntEditor({ campaignId, initialMaxWinners, initialProductId, initialReward }: { campaignId: string; initialMaxWinners: number; initialProductId: string; initialReward: { label: string; type: string; value: number | null } }) {
  const [maxWinners, setMaxWinners] = useState(initialMaxWinners);
  const [productId, setProductId] = useState(initialProductId);
  const [rewardLabel, setRewardLabel] = useState(initialReward.label);
  const [rewardValue, setRewardValue] = useState(initialReward.value?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { productId, maxWinners, reward: { ...initialReward, label: rewardLabel, value: rewardValue === "" ? null : Number(rewardValue) } } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hunt settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/70">Product ID (the item customers are hunting for)</label>
        <input value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/70">Max winners (spots available)</label>
        <input type="number" min={1} value={maxWinners} onChange={(e) => setMaxWinners(Number(e.target.value))} className="input text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} placeholder="Reward label" className="input text-sm" />
        <input type="number" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} placeholder="Reward value" className="input text-sm" />
      </div>
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

/** Collect & Unlock editor — the target count and the single reward unlocked at that threshold. */
function CollectUnlockEditor({ campaignId, initialTarget, initialReward }: { campaignId: string; initialTarget: number; initialReward: { type: string; label: string; value: number | null } }) {
  const [target, setTarget] = useState(initialTarget);
  const [rewardLabel, setRewardLabel] = useState(initialReward.label);
  const [rewardValue, setRewardValue] = useState(initialReward.value?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { target, reward: { ...initialReward, label: rewardLabel, value: rewardValue === "" ? null : Number(rewardValue) } } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Collect & Unlock settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/70">Target (items to collect)</label>
        <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="input text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} placeholder="Reward label" className="input text-sm" />
        <input type="number" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} placeholder="Reward value" className="input text-sm" />
      </div>
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

/** Hidden Cashback editor — the real KD amount range the random reveal draws from. */
function HiddenCashbackEditor({ campaignId, initialMin, initialMax }: { campaignId: string; initialMin: number; initialMax: number }) {
  const [minAmount, setMinAmount] = useState(initialMin);
  const [maxAmount, setMaxAmount] = useState(initialMax);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { minAmount, maxAmount } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hidden Cashback range saved");
    } catch {
      toast.error("Could not save range");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/70">Min amount (KD)</label>
          <input type="number" step="0.001" min={0} value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/70">Max amount (KD)</label>
          <input type="number" step="0.001" min={0} value={maxAmount} onChange={(e) => setMaxAmount(Number(e.target.value))} className="input text-sm" />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  );
}

export function CampaignRewardEditor({ campaignId, type, config }: { campaignId: string; type: string; config: any }) {
  if (type === "TREASURE_CHEST" || type === "MYSTERY_SAFE" || type === "SURPRISE_ENVELOPE" || type === "PICK_THREE") {
    return <RewardPoolEditor campaignId={campaignId} initialPool={config?.rewardPool ?? []} />;
  }
  if (type === "GOLDEN_TICKET") {
    return <GoldenTicketEditor campaignId={campaignId} initialOdds={config?.odds ?? 20} initialReward={config?.reward ?? { label: "", type: "MYSTERY_BOX" }} />;
  }
  if (type === "TREASURE_MAP") {
    return <TreasureMapEditor campaignId={campaignId} initialNodes={config?.nodes ?? []} />;
  }
  if (type === "LIMITED_TIME_HUNT") {
    return <LimitedTimeHuntEditor campaignId={campaignId} initialMaxWinners={config?.maxWinners ?? 10} initialProductId={config?.productId ?? ""} initialReward={config?.reward ?? { label: "Hunt Reward", type: "POINTS", value: null }} />;
  }
  if (type === "COLLECT_UNLOCK") {
    return <CollectUnlockEditor campaignId={campaignId} initialTarget={config?.target ?? 5} initialReward={config?.reward ?? { type: "POINTS", label: "Unlocked Reward", value: 50 }} />;
  }
  if (type === "HIDDEN_CASHBACK") {
    return <HiddenCashbackEditor campaignId={campaignId} initialMin={config?.minAmount ?? 0.5} initialMax={config?.maxAmount ?? 3} />;
  }
  return <p className="text-xs text-saveo-emerald-700/40">No structured editor for this campaign type yet.</p>;
}
