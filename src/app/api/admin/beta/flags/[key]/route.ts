import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { FeatureFlagService, FEATURE_FLAG_KEYS } from "@/lib/services/feature-flag-service";
import { z } from "zod";

const schema = z.object({ enabled: z.boolean() });

interface Params {
  params: Promise<{ key: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { key } = await params;
  if (!FEATURE_FLAG_KEYS.includes(key as any)) {
    return NextResponse.json({ error: "Unknown feature flag" }, { status: 400 });
  }

  const { enabled } = schema.parse(await req.json());
  const flag = await FeatureFlagService.setEnabled(key as any, enabled);

  return NextResponse.json({ success: true, flag });
}
