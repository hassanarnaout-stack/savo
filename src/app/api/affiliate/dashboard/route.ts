import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AffiliateService } from "@/lib/services/affiliate-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const account = await AffiliateService.createAccount(session.user.id);
  return NextResponse.json({ success: true, account });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const account = await prisma.affiliateAccount.findUnique({ where: { userId: session.user.id } });
  if (!account) return NextResponse.json({ error: "No affiliate account." }, { status: 404 });

  const [dashboard, activeRules] = await Promise.all([
    AffiliateService.getDashboard(account.id),
    prisma.affiliateMilestoneRule.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return NextResponse.json({ ...dashboard, activeRules });
}
