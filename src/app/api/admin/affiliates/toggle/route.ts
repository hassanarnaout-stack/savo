import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { FeatureFlagService } from "@/lib/services/feature-flag-service";
import { z } from "zod";

const schema = z.object({ enabled: z.boolean() });

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { enabled } = schema.parse(await req.json());
  await FeatureFlagService.setEnabled("affiliate_program", enabled);
  return NextResponse.json({ success: true, enabled });
}

export async function GET() {
  const enabled = await FeatureFlagService.isEnabled("affiliate_program");
  return NextResponse.json({ enabled });
}
