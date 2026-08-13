import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().optional(),
  parentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const category = await prisma.category.create({
    data: {
      name: body.name,
      slug: body.slug,
      icon: body.icon || null,
      parentId: body.parentId || null,
      isActive: true,
    },
  });

  return NextResponse.json(category);
}
