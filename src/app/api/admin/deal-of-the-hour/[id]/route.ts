import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DealOfTheHourService } from "@/lib/services/deal-of-the-hour-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const deal = await DealOfTheHourService.deactivate(id);
  return NextResponse.json({ success: true, deal });
}
