import { prisma } from "@/lib/prisma";
import { AddMediaForm, DeleteMediaButton } from "@/components/admin/media-manager-controls";

interface Props {
  searchParams: Promise<{ productId?: string; q?: string }>;
}

export default async function AdminMediaManagerPage({ searchParams }: Props) {
  const { productId, q } = await searchParams;

  const products = await prisma.product.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 50,
  });

  const media = productId
    ? await prisma.productMedia.findMany({ where: { productId }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] })
    : [];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Media Manager</h1>

      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="Search products..." className="input max-w-sm text-sm" />
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl2 border border-black/5 bg-white p-4 lg:col-span-1">
          <p className="mb-2 text-xs font-bold uppercase text-saveo-emerald-700/50">Select Product</p>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {products.map((p) => (
              <a
                key={p.id}
                href={`/admin/media?productId=${p.id}`}
                className={`block rounded-lg px-3 py-2 text-sm ${p.id === productId ? "bg-saveo-emerald-700 text-white" : "hover:bg-black/5"}`}
              >
                {p.name}
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {productId ? (
            <div className="space-y-4">
              <AddMediaForm productId={productId} />
              <div className="space-y-2">
                {media.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-black/5 bg-white p-3 text-sm">
                    <div>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-saveo-emerald-700/70">{m.type}</span>
                      <span className="ms-2 truncate text-saveo-emerald-700/60">{m.url}</span>
                    </div>
                    <DeleteMediaButton mediaId={m.id} />
                  </div>
                ))}
                {media.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No media yet for this product.</p>}
              </div>
            </div>
          ) : (
            <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
              Select a product to manage its media.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
