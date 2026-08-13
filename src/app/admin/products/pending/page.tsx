import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { formatKWD } from "@/lib/utils";
import { ProductApprovalActions } from "@/components/admin/product-approval-actions";

export default async function AdminPendingProductsPage() {
  const products = await prisma.product.findMany({
    where: { approvalStatus: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" }, // oldest submissions reviewed first
    include: {
      images: { take: 3, orderBy: { sortOrder: "asc" } },
      category: { select: { name: true } },
      supplier: { select: { companyName: true, verificationStatus: true } },
    },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-2 text-2xl font-bold">Product Approval Queue</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">{products.length} products awaiting review</p>

      <div className="space-y-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl2 border border-black/5 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="flex gap-1.5">
                  {p.images.slice(0, 3).map((img) => (
                    <div key={img.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black/5">
                      <Image src={img.url} alt={p.name} fill className="object-cover" />
                    </div>
                  ))}
                  {p.images.length === 0 && (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 text-[10px] font-bold text-red-600">
                      NO IMAGE
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-saveo-emerald-700/50">
                    {p.supplier.companyName} · {p.category.name}
                  </p>
                  <p className="mt-1 text-sm">
                    {formatKWD(Number(p.saveoPrice))}{" "}
                    <span className="text-saveo-emerald-700/40 line-through">{formatKWD(Number(p.originalPrice))}</span>
                  </p>
                  {p.barcode && <p className="mt-0.5 font-mono text-[10px] text-saveo-emerald-700/40">{p.barcode}</p>}
                  <p className="mt-1 line-clamp-2 max-w-md text-xs text-saveo-emerald-700/60">{p.description}</p>
                </div>
              </div>
              <ProductApprovalActions productId={p.id} />
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No products awaiting review. 🎉
          </div>
        )}
      </div>
    </div>
  );
}
