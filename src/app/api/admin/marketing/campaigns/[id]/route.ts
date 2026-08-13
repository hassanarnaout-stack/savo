import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Real safety check — never delete a campaign that already has activity
  // recorded against it (views, claims, rewards). Deleting a campaign with
  // real event history would break analytics and could orphan reward
  // records. Deactivate it instead if it has ever run for real.
  const eventCount = await prisma.campaignEvent.count({ where: { campaignId: id } });
  if (eventCount > 0) {
    return NextResponse.json(
      { error: `This campaign has ${eventCount} recorded event(s) — deactivate it instead of deleting, to preserve analytics history.` },
      { status: 409 }
    );
  }

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
