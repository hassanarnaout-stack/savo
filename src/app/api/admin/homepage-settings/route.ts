import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { HomepageSettingsService } from "@/lib/services/homepage-settings-service";
import { z } from "zod";

const schema = z.object({ heroProductCount: z.number().int() });

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const settings = await HomepageSettingsService.get();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { heroProductCount } = schema.parse(await req.json());
  const settings = await HomepageSettingsService.updateHeroProductCount(heroProductCount);
  return NextResponse.json({ success: true, settings });
}
