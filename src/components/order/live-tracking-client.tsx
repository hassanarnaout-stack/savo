"use client";

import { useEffect, useState } from "react";
import { Truck, Phone, CheckCircle2, Clock, KeyRound } from "lucide-react";

interface DeliveryInfo {
  status: string;
  estimatedDeliveryAt: string | null;
  pickedAt: string | null;
  deliveredAt: string | null;
  deliveryOtp: string | null;
  deliveryProofUrl: string | null;
  driver: { name: string; phone: string; currentLat: number | null; currentLng: number | null; lastPingAt: string | null } | null;
}

interface TrackedDelivery {
  supplierOrderId: string;
  orderStatus: string;
  delivery: DeliveryInfo | null;
}

const STEPS = ["READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
const STEP_LABELS: Record<string, string> = {
  READY_FOR_PICKUP: "Preparing",
  PICKED_UP: "Picked Up",
  OUT_FOR_DELIVERY: "On the Way",
  DELIVERED: "Delivered",
};

function minutesAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

/** Real near-real-time via polling every 15s while the page is open — no WebSocket infrastructure exists in this project. */
export function LiveTrackingClient({ orderId }: { orderId: string }) {
  const [deliveries, setDeliveries] = useState<TrackedDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTracking() {
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      const data = await res.json();
      if (res.ok) setDeliveries(data.deliveries);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) return <p className="text-sm text-saveo-emerald-700/40">Loading tracking...</p>;

  const withDelivery = deliveries.filter((d) => d.delivery);
  if (withDelivery.length === 0) {
    return <p className="text-sm text-saveo-emerald-700/40">No delivery assigned yet.</p>;
  }

  return (
    <div className="space-y-6">
      {withDelivery.map(({ supplierOrderId, delivery }) => {
        if (!delivery) return null;
        const currentStepIndex = STEPS.indexOf(delivery.status);
        const lastPing = minutesAgo(delivery.driver?.lastPingAt ?? null);

        return (
          <div key={supplierOrderId} className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              {STEPS.map((step, i) => (
                <div key={step} className="flex flex-1 flex-col items-center text-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= currentStepIndex ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/30"}`}>
                    {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <p className={`mt-1 text-[10px] ${i <= currentStepIndex ? "font-semibold text-saveo-emerald-700" : "text-saveo-emerald-700/30"}`}>{STEP_LABELS[step]}</p>
                </div>
              ))}
            </div>

            {delivery.status === "DELIVERED" ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-saveo-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Delivered {delivery.deliveredAt && new Date(delivery.deliveredAt).toLocaleString()}
              </p>
            ) : (
              <>
                {delivery.estimatedDeliveryAt && (
                  <p className="mb-2 flex items-center gap-1.5 text-sm text-saveo-emerald-700/70">
                    <Clock className="h-4 w-4" /> Estimated: {new Date(delivery.estimatedDeliveryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {delivery.driver && (
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-black/[0.02] p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-saveo-emerald-700/50" />
                      <span className="font-semibold">{delivery.driver.name}</span>
                    </div>
                    <a href={`tel:${delivery.driver.phone}`} className="flex items-center gap-1 text-saveo-emerald-600">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  </div>
                )}
                {lastPing !== null && (
                  <p className="mb-2 text-xs text-saveo-emerald-700/40">
                    Driver location last updated {lastPing < 1 ? "just now" : `${lastPing} min ago`}
                  </p>
                )}
                {delivery.deliveryOtp && (
                  <div className="rounded-lg bg-saveo-gold-50 p-3 text-center">
                    <p className="mb-1 flex items-center justify-center gap-1 text-xs font-semibold text-saveo-emerald-700/70">
                      <KeyRound className="h-3.5 w-3.5" /> Give this code to your driver on handoff
                    </p>
                    <p className="text-2xl font-black tracking-widest text-saveo-emerald-700">{delivery.deliveryOtp}</p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
