import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  companyInfoVerified: z.boolean().optional(),
  contactVerified: z.boolean().optional(),
  productQualityChecked: z.boolean().optional(),
  barcodeChecked: z.boolean().optional(),
  imagesChecked: z.boolean().optional(),
  pricingReviewed: z.boolean().optional(),
  commissionAgreed: z.boolean().optional(),
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
  notes: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>; // supplierId
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: supplierId } = await params;
  const body = schema.parse(await req.json());

  const checklist = await prisma.supplierOnboardingChecklist.upsert({
    where: { supplierId },
    update: {
      ...body,
      reviewedByUserId: session.user?.id,
      reviewedAt: body.status ? new Date() : undefined,
    },
    create: {
      supplierId,
      ...body,
      reviewedByUserId: session.user?.id,
      reviewedAt: body.status ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true, checklist });
}
