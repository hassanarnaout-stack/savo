import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AddressService, AddressNotFoundError } from "@/lib/services/address-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;

  try {
    const address = await AddressService.setDefault(session.user.id, id);
    return NextResponse.json({ success: true, address });
  } catch (err) {
    if (err instanceof AddressNotFoundError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
}
