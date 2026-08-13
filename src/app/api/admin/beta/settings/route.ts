import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BetaService } from "@/lib/services/beta-service";
import { z } from "zod";

const schema = z.object({
  enabled: z.boolean().optional(),
  inviteOnly: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const settings = await BetaService.updateSettings({
    enabled: body.enabled,
    inviteOnly: body.inviteOnly,
    startDate: body.startDate === undefined ? undefined : body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate === undefined ? undefined : body.endDate ? new Date(body.endDate) : null,
  });

  return NextResponse.json({ success: true, settings });
}
