import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { ModerateReviewButtons } from "@/components/admin/moderate-review-buttons";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-black/5 bg-black/[0.02]",
  FLAGGED: "border-red-200 bg-red-50",
};

export default async function AdminReviewModerationPage() {
  const reviews = await prisma.review.findMany({
    where: { status: { in: ["PENDING", "FLAGGED"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { name: true } }, user: { select: { name: true, email: true } }, media: true },
  });

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Review Moderation" }]} />
      <h1 className="mb-1 text-2xl font-bold">Review Moderation</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        Verified-purchase reviews with no spam signal skip this queue automatically. Only unverified or flagged reviews land here.
      </p>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className={`rounded-xl2 border p-4 ${STATUS_STYLES[r.status]}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{r.product.name}</p>
                <p className="text-xs text-saveo-emerald-700/50">{r.user.name ?? r.user.email} · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.status}</p>
              </div>
              <ModerateReviewButtons reviewId={r.id} />
            </div>
            {r.comment && <p className="mb-2 text-sm text-saveo-emerald-700/80">{r.comment}</p>}
            {r.moderationNote && <p className="mb-2 text-xs font-semibold text-red-600">⚠ {r.moderationNote}</p>}
            {r.media.length > 0 && (
              <div className="flex gap-2">
                {r.media.map((m) => (
                  <img key={m.id} src={m.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No reviews waiting for moderation. 🎉
          </div>
        )}
      </div>
    </div>
  );
}
