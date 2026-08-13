import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { askAssistant } from "@/lib/ai-assistant";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(1).max(500),
  sessionId: z.string().min(1),
  productId: z.string().optional(),
  brandName: z.string().optional(),
  categoryId: z.string().optional(),
  compareProductIds: z.array(z.string()).max(4).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = schema.parse(await req.json());

  // Real, correct isolation: requestingUserId always comes from the real
  // authenticated session, never from the request body.
  const requestingUserId = session?.user?.id ?? null;

  const response = await askAssistant({
    query: body.query,
    sessionId: body.sessionId,
    requestingUserId,
    productId: body.productId,
    brandName: body.brandName,
    categoryId: body.categoryId,
    compareProductIds: body.compareProductIds,
  });

  return NextResponse.json(response);
}
