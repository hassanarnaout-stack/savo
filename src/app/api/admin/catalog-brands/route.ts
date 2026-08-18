import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BrandService } from "@/lib/services/brand-service";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(120),
  nameAr: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const brands = await BrandService.listActive();
  return NextResponse.json({ brands });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = schema.parse(await req.json());
  const brand = await BrandService.create(body);
  return NextResponse.json({ success: true, brand });
}
