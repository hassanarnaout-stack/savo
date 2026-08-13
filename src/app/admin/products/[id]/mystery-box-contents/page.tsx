import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MysteryBoxContentsManager } from "@/components/admin/mystery-box-contents-manager";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MysteryBoxContentsPage({ params }: Props) {
  const { id } = await params;

  const box = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, type: true } });
  if (!box || box.type !== "MYSTERY_BOX") notFound();

  const contents = await prisma.mysteryBoxContent.findMany({
    where: { mysteryBoxId: id },
    include: { possibleProduct: { select: { id: true, name: true, saveoPrice: true } } },
    orderBy: { probability: "desc" },
  });

  const totalProbability = contents.reduce((sum, c) => sum + Number(c.probability), 0);

  return (
    <MysteryBoxContentsManager
      boxId={box.id}
      boxName={box.name}
      initialContents={contents as any}
      initialTotalProbability={totalProbability}
    />
  );
}
