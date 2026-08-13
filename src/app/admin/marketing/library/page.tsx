import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/admin/breadcrumb";

interface Props {
  searchParams: Promise<{ q?: string; type?: string; dateFrom?: string; dateTo?: string }>;
}

export default async function ContentLibraryPage({ searchParams }: Props) {
  const { q, type, dateFrom, dateTo } = await searchParams;
  const activeType = type ?? "all";

  const dateFilter = (dateFrom || dateTo)
    ? { createdAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } }
    : {};

  const [adContents, generatedAds, campaigns] = await Promise.all([
    activeType === "all" || activeType === "texts"
      ? prisma.adContent.findMany({
          where: { ...dateFilter, ...(q ? { headline: { contains: q, mode: "insensitive" } } : {}) },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [],
    activeType === "all" || activeType === "images"
      ? prisma.generatedAd.findMany({ where: dateFilter, orderBy: { createdAt: "desc" }, take: 30 })
      : [],
    activeType === "all" || activeType === "campaigns"
      ? prisma.marketingCampaign.findMany({
          where: { ...dateFilter, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [],
  ]);

  const TABS = [
    { value: "all", label: "All" },
    { value: "images", label: "Images" },
    { value: "texts", label: "Generated Texts" },
    { value: "campaigns", label: "Previous Campaigns" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Marketing Studio", href: "/admin/marketing/studio" }, { label: "Content Library" }]} />
      <h1 className="mb-6 text-2xl font-bold">📚 Content Library</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <a
            key={t.value}
            href={`?type=${t.value}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${activeType === t.value ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-2">
        <input type="hidden" name="type" value={activeType} />
        <input name="q" defaultValue={q} placeholder="Search..." className="input max-w-xs text-sm" />
        <input type="date" name="dateFrom" defaultValue={dateFrom} className="input text-sm" title="From" />
        <input type="date" name="dateTo" defaultValue={dateTo} className="input text-sm" title="To" />
        <button type="submit" className="btn-outline text-sm">Filter</button>
      </form>

      {(activeType === "all" || activeType === "images") && (
        <>
          <h2 className="mb-2 font-bold text-saveo-emerald-700">Images ({generatedAds.length})</h2>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {generatedAds.map((ad) => (
              <div key={ad.id} className="overflow-hidden rounded-xl2 border border-black/5 bg-white">
                <div className="aspect-square" dangerouslySetInnerHTML={{ __html: ad.svgContent }} />
                <p className="p-2 text-center text-[10px] text-saveo-emerald-700/50">{ad.templateType}</p>
              </div>
            ))}
            {generatedAds.length === 0 && <p className="col-span-full text-sm text-saveo-emerald-700/40">No images yet.</p>}
          </div>
        </>
      )}

      {(activeType === "all" || activeType === "texts") && (
        <>
          <h2 className="mb-2 font-bold text-saveo-emerald-700">Generated Texts ({adContents.length})</h2>
          <div className="mb-6 space-y-2">
            {adContents.map((a) => (
              <div key={a.id} className="rounded-xl2 border border-black/5 bg-white p-3 text-sm">
                <p className="font-semibold">{a.headline}</p>
                <p className="text-xs text-saveo-emerald-700/50">{a.platform} · {a.tone} · {new Date(a.createdAt).toLocaleDateString("en-GB")}</p>
              </div>
            ))}
            {adContents.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No generated texts yet.</p>}
          </div>
        </>
      )}

      {(activeType === "all" || activeType === "campaigns") && (
        <>
          <h2 className="mb-2 font-bold text-saveo-emerald-700">Previous Campaigns ({campaigns.length})</h2>
          <div className="space-y-2">
            {campaigns.map((c) => (
              <a key={c.id} href={`/admin/marketing/studio/${c.id}`} className="block rounded-xl2 border border-black/5 bg-white p-3 text-sm hover:border-saveo-emerald-300">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-saveo-emerald-700/50">{c.type} · {c.status} · {new Date(c.createdAt).toLocaleDateString("en-GB")}</p>
              </a>
            ))}
            {campaigns.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No campaigns yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}
