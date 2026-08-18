import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BrandService } from "@/lib/services/brand-service";
import { z } from "zod";

/** dryRun defaults to true — an execute run requires an EXPLICIT
 * {"dryRun": false} body, never a default/accidental destructive
 * call. Nothing here ever touches Product.brandName. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { dryRun } = z.object({ dryRun: z.boolean().default(true) }).parse(await req.json().catch(() => ({})));
  const result = await BrandService.backfillFromBrandName(dryRun);
  return NextResponse.json(result);
}
