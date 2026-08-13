"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Map, CheckCircle2, Circle, Lock } from "lucide-react";

interface MapNode {
  id: string;
  category: string;
  task: string;
  reward: { type: string; label: string; value: number | null };
  order: number;
  completed: boolean;
  eligible: boolean;
}

export function TreasureMapExperience({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [description, setDescription] = useState<{ en: string | null; ar: string | null }>({ en: null, ar: null });

  function load() {
    fetch("/api/campaigns/treasure-map/status")
      .then((r) => r.json())
      .then((data) => {
        setAvailable(data.available);
        setNodes(data.nodes ?? []);
        if (data.campaign) {
          setDescription({ en: data.campaign.customerDescription, ar: data.campaign.customerDescriptionAr });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function claim(nodeId: string) {
    setClaiming(nodeId);
    try {
      const res = await fetch("/api/campaigns/treasure-map/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not claim");
      toast.success(`🎉 ${data.reward.label}`);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Could not claim this stamp");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) return <div className="py-20 text-center text-saveo-emerald-700/40">Loading...</div>;

  if (!available) {
    return (
      <div className="py-20 text-center">
        <Map className="mx-auto h-12 w-12 text-saveo-emerald-700/20" />
        <p className="mt-4 text-saveo-emerald-700/50">The Weekly Treasure Map isn't available right now.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🗺️ خريطة الكنز الأسبوعية" : "🗺️ Weekly Treasure Map"}
      </h1>
      <p className="mt-1 text-sm text-saveo-emerald-700/50">
        {locale === "ar" ? (description.ar || "أكمل المهام واجمع الأختام") : (description.en || "Complete tasks and collect stamps")}
      </p>

      <div className="mt-8 space-y-3">
        {nodes.map((node) => (
          <div key={node.id} className={`flex items-center gap-3 rounded-xl2 border p-4 ${node.completed ? "border-saveo-emerald-200 bg-saveo-emerald-50" : "border-black/5 bg-white"}`}>
            {node.completed ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-saveo-emerald-600" />
            ) : node.eligible ? (
              <Circle className="h-6 w-6 shrink-0 text-saveo-gold-500" />
            ) : (
              <Lock className="h-6 w-6 shrink-0 text-saveo-emerald-700/20" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold">{node.task}</p>
              <p className="text-xs text-saveo-emerald-700/50">{node.reward.label}</p>
            </div>
            {!node.completed && node.eligible && (
              <button onClick={() => claim(node.id)} disabled={claiming === node.id} className="btn-primary !py-1.5 text-xs">
                {claiming === node.id ? "..." : locale === "ar" ? "استلم" : "Claim"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
