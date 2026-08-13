import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { RevealExperience } from "@/components/mystery-box/reveal-experience";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MysteryBoxRevealPage({ params }: Props) {
  const FEATURE_FLAGS = await getLaunchFlags();
  if (!FEATURE_FLAGS.MYSTERY_BOX_ENABLED) notFound();

  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) redirect(`/login?callbackUrl=/mystery-boxes/reveal/${id}`);

  const reveal = await prisma.mysteryBoxReveal.findUnique({
    where: { id },
    include: {
      orderItem: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } },
      items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } },
    },
  });

  // SECURITY: 404 (not 403) if it doesn't exist or belongs to someone else.
  if (!reveal || reveal.userId !== session.user.id) notFound();

  const box = reveal.orderItem.product;
  const chosenIds = new Set((reveal.chosenProductIds as string[] | null) ?? []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <RevealExperience
        revealId={reveal.id}
        boxName={box.name}
        boxNameAr={box.nameAr}
        boxImage={box.images[0]?.url ?? null}
        quantity={reveal.orderItem.quantity}
        fallbackDescription={box.mysteryBoxReveal}
        fallbackDescriptionAr={box.mysteryBoxRevealAr}
        alreadyRevealed={!!reveal.revealedAt}
        items={reveal.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          name: i.product.name,
          nameAr: i.product.nameAr,
          slug: i.product.slug,
          image: i.product.images[0]?.url ?? null,
          saveoPrice: Number(i.product.saveoPrice),
          isYourPick: chosenIds.has(i.productId),
        }))}
      />
    </div>
  );
}
