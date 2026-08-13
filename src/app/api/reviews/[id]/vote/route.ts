import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ReviewService } from "@/lib/services/review-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to vote." }, { status: 401 });
  }

  const { id } = await params;
  const result = await ReviewService.toggleHelpfulVote(id, session.user.id);
  return NextResponse.json({ success: true, ...result });
}
