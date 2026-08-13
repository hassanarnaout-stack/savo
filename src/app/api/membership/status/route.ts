import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { BenefitEngine } from "@/lib/services/benefit-engine";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ isMember: false, extraDiscountPercent: 0, hasFreeDelivery: false });
  }

  const membership = await MembershipService.getUserMembership(session.user.id);
  const isMember = !!membership && membership.status === "ACTIVE" && membership.endsAt > new Date();

  return NextResponse.json({
    isMember,
    extraDiscountPercent: isMember ? BenefitEngine.getExtraDiscountPercent(membership as any) : 0,
    hasFreeDelivery: isMember ? BenefitEngine.hasFreeDelivery(membership as any) : false,
  });
}
