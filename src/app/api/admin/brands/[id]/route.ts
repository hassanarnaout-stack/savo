import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = schema.parse(await req.json());
  const brand = await prisma.brandAccount.update({ where: { id }, data: { status } });

  logger.info("Brand account status changed", { brandId: id, status, byUserId: session.user!.id });

  return NextResponse.json({ success: true, brand });
}
