import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ lat: z.number(), lng: z.number() });

interface Params {
  params: Promise<{ id: string }>; // driverId
}

/**
 * Phase 6.4 — location ping foundation. No dedicated driver login/auth
 * system exists yet (drivers aren't Saveo platform users), so this is
 * admin-gated for now rather than a genuinely open driver-app endpoint.
 * A real fleet app would authenticate drivers directly — that's a
 * follow-up, not pretended to be solved here.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { lat, lng } = schema.parse(await req.json());

  const driver = await prisma.deliveryDriver.update({
    where: { id },
    data: { currentLat: lat, currentLng: lng, lastPingAt: new Date() },
  });

  return NextResponse.json({ success: true, driver });
}
