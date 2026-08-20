import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AddressService } from "@/lib/services/address-service";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().nullable().optional(),
  fullName: z.string().min(1),
  phone: z.string().min(1),
  governorate: z.string().min(1),
  area: z.string().min(1),
  block: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  building: z.string().nullable().optional(),
  floor: z.string().nullable().optional(),
  apartment: z.string().nullable().optional(),
  avenue: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  makeDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const addresses = await AddressService.list(session.user.id);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { makeDefault, ...input } = addressSchema.parse(await req.json());
  const address = await AddressService.create(session.user.id, input, makeDefault ?? false);
  return NextResponse.json({ success: true, address });
}
