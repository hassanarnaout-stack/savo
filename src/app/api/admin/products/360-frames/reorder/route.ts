import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ orderedIds: z.array(z.string()).min(1) });

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { orderedIds } = schema.parse(await req.json());

  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.productMedia.update({ where: { id }, data: { sortOrder: index } }))
  );

  return NextResponse.json({ success: true });
}
