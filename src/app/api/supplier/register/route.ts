import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { BetaService } from "@/lib/services/beta-service";
import { NotificationService } from "@/lib/notifications/service";

const schema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(8),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Supplier Terms to register." }),
  }),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`${ip}:supplier-register`, RATE_LIMITS.REGISTER);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit exceeded on supplier register", { ip });
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = schema.parse(await req.json());

  const canRegister = await BetaService.canRegister(body.email, "SUPPLIER");
  if (!canRegister) {
    return NextResponse.json(
      { error: "Supplier registration is currently invite-only. Please contact us for access." },
      { status: 403 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
  if (existingUser) {
    return NextResponse.json({ error: "This email is already registered." }, { status: 400 });
  }

  // Ensure a unique slug even if two suppliers pick similar company names
  const baseSlug = slugify(body.companyName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.supplier.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const passwordHash = await bcrypt.hash(body.password, 10);

  const supplier = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: body.contactName,
        email: body.email,
        passwordHash,
        role: "SUPPLIER",
      },
    });

    const supplier = await tx.supplier.create({
      data: {
        ownerUserId: user.id,
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        slug,
        status: "PENDING",
        verificationStatus: "PENDING",
        termsAcceptedAt: new Date(),
      },
    });

    return supplier;
  });

  await BetaService.markInviteRegistered(body.email);

  NotificationService.dispatch({
    type: "SUPPLIER_APPLICATION_SUBMITTED",
    recipientEmail: body.email,
    data: { companyName: body.companyName },
  });

  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { email: true } });
  for (const admin of admins) {
    NotificationService.dispatch({
      type: "NEW_SUPPLIER_REQUEST",
      recipientEmail: admin.email,
      data: { companyName: body.companyName, supplierId: supplier.id },
    });
  }

  return NextResponse.json({ success: true });
}
