import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { LoginShowcaseService } from "@/lib/services/login-showcase-service";
import { z } from "zod";

const schema = z.object({
  leftProductId: z.string().nullable().optional(),
  centerProductId: z.string().nullable().optional(),
  rightProductId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const settings = await LoginShowcaseService.get();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = schema.parse(await req.json());
  const settings = await LoginShowcaseService.update(body);
  return NextResponse.json({ success: true, settings });
}
