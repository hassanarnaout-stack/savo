import { prisma } from "@/lib/prisma";

export async function BrandTakeoverBanner() {
  const now = new Date();
  const takeover = await prisma.brandTakeover.findFirst({
    where: { startAt: { lte: now }, endAt: { gt: now } },
    include: { brand: { select: { companyName: true } } },
    orderBy: { startAt: "desc" },
  });

  if (!takeover) return null;

  if (takeover.status !== "LIVE") {
    prisma.brandTakeover.update({ where: { id: takeover.id }, data: { status: "LIVE" } }).catch(() => {});
  }

  return (
    <div className="saveo-aura shadow-luxury relative overflow-hidden rounded-xl2">
      <img src={takeover.banner} alt={takeover.title} className="h-40 w-full object-cover sm:h-56" />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-center text-white">
        <p className="text-xl font-black sm:text-2xl">{takeover.title}</p>
        <p className="text-xs font-semibold opacity-80">powered by {takeover.brand.companyName}</p>
      </div>
    </div>
  );
}
