import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BrandService } from "@/lib/services/brand-service";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  nameAr: z.string().max(120).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  descriptionAr: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const body = schema.parse(await req.json());
  const brand = await BrandService.update(id, body);
  return NextResponse.json({ success: true, brand });
}
