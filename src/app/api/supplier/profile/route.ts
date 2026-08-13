import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupplier } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  logo: z.string().optional(),
  description: z.string().min(10),
  address: z.string().min(5),
  commercialRegistrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  website: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  let supplier;
  try {
    ({ supplier } = await requireSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  await prisma.supplier.update({
    where: { id: supplier.id },
    data: {
      logo: body.logo || null,
      description: body.description,
      address: body.address,
      commercialRegistrationNumber: body.commercialRegistrationNumber || null,
      taxNumber: body.taxNumber || null,
      website: body.website || null,
    },
  });

  return NextResponse.json({ success: true });
}
