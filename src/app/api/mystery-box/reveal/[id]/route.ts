import { NextRequest, NextResponse } from "next/server";

/**
 * RETIRED (2026 approved Figma decision) — the old customer-triggered
 * digital "Open Mystery Box" reveal is cancelled. Hidden contents are
 * now allocated automatically at checkout (see
 * src/app/api/checkout/route.ts → openMysteryBoxReveal()) and are
 * NEVER shown to the customer, digitally, at any point — the physical
 * unboxing at delivery is the only reveal.
 *
 * This endpoint is kept (not deleted) only so old bookmarked/shared
 * URLs return a clear, safe response instead of a 404 — it performs
 * ZERO reveal logic and returns ZERO hidden-content data, regardless
 * of the underlying MysteryBoxReveal row's state (old pending reveals
 * from before this change included).
 */
export async function POST(_req: NextRequest, _ctx: { params: Promise<{ id: string }> }) {
  return NextResponse.json(
    { error: "Mystery Box reveals are no longer available online — your surprises stay secret until your box arrives. Check your order for status." },
    { status: 410 }
  );
}
