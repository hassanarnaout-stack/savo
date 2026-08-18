import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BrandService } from "@/lib/services/brand-service";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const result = await BrandService.findStrandedLegacyBrandRows();
  return NextResponse.json(result);
}
