import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  getChoiceOptions,
  submitChoices,
  RevealOwnershipError,
  AlreadyRevealedError,
  InvalidChoiceCountError,
  InvalidChoiceProductError,
  ChoicesAlreadySubmittedError,
} from "@/lib/mystery-box";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await prisma.$transaction((tx) => getChoiceOptions(tx, { revealId: id, userId: session.user!.id }));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RevealOwnershipError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not load choices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];

  try {
    await prisma.$transaction((tx) => submitChoices(tx, { revealId: id, userId: session.user!.id, productIds }));
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof RevealOwnershipError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      err instanceof AlreadyRevealedError ||
      err instanceof InvalidChoiceCountError ||
      err instanceof InvalidChoiceProductError ||
      err instanceof ChoicesAlreadySubmittedError
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not save your picks" }, { status: 500 });
  }
}
