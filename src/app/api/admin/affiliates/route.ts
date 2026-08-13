import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [affiliates, pendingWithdrawals] = await Promise.all([
    prisma.affiliateAccount.findMany({
      orderBy: { totalEarned: "desc" },
      include: { user: { select: { name: true, email: true } }, _count: { select: { clicks: true, referrals: true, milestones: true } } },
      take: 100,
    }),
    prisma.affiliateWithdrawal.findMany({
      where: { status: "PENDING" },
      include: { affiliate: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ affiliates, pendingWithdrawals });
}
