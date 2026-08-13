import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewService } from "@/lib/services/review-service";
import { z } from "zod";

const schema = z.object({ content: z.string().min(1).max(1000) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const review = await prisma.review.findUnique({
    where: { id },
    select: { product: { select: { supplier: { select: { ownerUserId: true } } } } },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const isOwningSupplier = review.product.supplier.ownerUserId === session.user.id;
  if (!isAdmin && !isOwningSupplier) {
    return NextResponse.json({ error: "Only the product's supplier or an admin can reply to this review." }, { status: 403 });
  }

  const { content } = schema.parse(await req.json());
  const reply = await ReviewService.addReply(id, session.user.id, isAdmin ? "Savo Team" : "Supplier", content);

  return NextResponse.json({ success: true, reply });
}
