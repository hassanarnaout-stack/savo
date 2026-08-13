"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const LABELS: Record<string, string> = {
  ACCEPTED: "Accept Order",
  PREPARING: "Start Preparing",
  SHIPPED: "Mark as Shipped",
  DELIVERED: "Mark as Delivered",
  CANCELLED: "Cancel Order",
};

export function SupplierOrderActions({
  supplierOrderId,
  nextStatuses,
}: {
  supplierOrderId: string;
  nextStatuses: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function transition(status: string) {
    if (status === "CANCELLED" && !confirm("Cancel this order? This releases the reserved stock back to available.")) {
      return;
    }
    setLoading(status);
    try {
      const res = await fetch(`/api/supplier/orders/${supplierOrderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Update failed");
      }
      toast.success(`Order marked as ${status}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update order status");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-3 font-bold text-saveo-emerald-700">Update Status</h2>
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) =>
          status === "CANCELLED" ? (
            <button
              key={status}
              onClick={() => transition(status)}
              disabled={!!loading}
              className="btn-outline !py-2 text-sm !border-red-300 !text-red-600 hover:!border-red-500"
            >
              {loading === status ? "Cancelling..." : LABELS[status]}
            </button>
          ) : (
            <button
              key={status}
              onClick={() => transition(status)}
              disabled={!!loading}
              className="btn-primary !py-2 text-sm"
            >
              {loading === status ? "Updating..." : LABELS[status] ?? status}
            </button>
          )
        )}
      </div>
    </section>
  );
}
