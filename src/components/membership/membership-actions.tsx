"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SubscribeButton({
  planId,
  pricingOptionId,
  label,
}: {
  planId: string;
  pricingOptionId: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/membership/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, pricingOptionId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Welcome to Savo Plus! 🎉");
      router.refresh();
    } catch {
      toast.error("Could not activate membership");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleSubscribe} disabled={loading} className="btn-primary w-full">
      {loading ? "..." : label}
    </button>
  );
}

export function CancelMembershipButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel your Savo Plus membership? You'll keep your benefits until the end of the current period.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/membership/cancel", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Membership cancelled — benefits continue until renewal date");
      router.refresh();
    } catch {
      toast.error("Could not cancel membership");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleCancel} disabled={loading} className="text-sm font-semibold text-red-600 hover:underline">
      {loading ? "..." : "Cancel membership"}
    </button>
  );
}
