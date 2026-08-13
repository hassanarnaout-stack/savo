import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  description: z.string().optional(),
  logo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const existing = await prisma.brandAccount.findUnique({ where: { ownerUserId: session.user.id } });
  if (existing) {
    return NextResponse.json({ error: "A brand account already exists for this user." }, { status: 409 });
  }

  const body = schema.parse(await req.json());

  const result = await prisma.$transaction(async (tx) => {
    const brand = await tx.brandAccount.create({
      data: { ownerUserId: session.user!.id!, ...body, status: "PENDING" },
    });
    await tx.user.update({ where: { id: session.user!.id! }, data: { role: "BRAND" } });
    return brand;
  });

  // Audit log (§16) — every brand registration is logged for the admin review queue.
  logger.info("Brand account registration submitted", { brandId: result.id, companyName: result.companyName });

  return NextResponse.json({ success: true, brand: result });
}
