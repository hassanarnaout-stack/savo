import { redirect } from "next/navigation";
import { getBrandAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateBrandCampaignFormClient } from "@/components/brand/create-brand-campaign-form";

export default async function CreateBrandCampaignPage() {
  const gate = await getBrandAccountGate();
  if (!gate.ok) redirect("/brand");

  const segments = await prisma.audienceSegment.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <CreateBrandCampaignFormClient segments={segments} />
    </div>
  );
}
