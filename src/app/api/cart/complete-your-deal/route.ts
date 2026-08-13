import { NextRequest, NextResponse } from "next/server";
import { getCompleteYourDeal } from "@/lib/recommendations";

export async function GET(req: NextRequest) {
  const productIds = req.nextUrl.searchParams.get("productIds")?.split(",").filter(Boolean) ?? [];
  const products = await getCompleteYourDeal(productIds);
  return NextResponse.json({ products });
}
