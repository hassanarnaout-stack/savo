import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AddressService, AddressNotFoundError } from "@/lib/services/address-service";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const updateSchema = z.object({
  label: z.string().nullable().optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  governorate: z.string().min(1).optional(),
  area: z.string().min(1).optional(),
  block: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  building: z.string().nullable().optional(),
  floor: z.string().nullable().optional(),
  apartment: z.string().nullable().optional(),
  avenue: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const input = updateSchema.parse(await req.json());

  try {
    const address = await AddressService.update(session.user.id, id, input);
    return NextResponse.json({ success: true, address });
  } catch (err) {
    if (err instanceof AddressNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;

  try {
    await AddressService.delete(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AddressNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
}
