import { prisma } from "@/lib/prisma";

export default async function AdminFeedbackPage() {
  const [feedbackList, avgRatingAgg, categoryBreakdown] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: true }),
    prisma.feedback.groupBy({
      by: ["category"],
      _count: true,
      _avg: { rating: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const avgRating = avgRatingAgg._avg.rating ?? 0;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Customer Feedback</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl2 border border-black/5 bg-white p-5">
          <p className="text-xs text-saveo-emerald-700/50">Average Rating</p>
          <p className="text-3xl font-black text-saveo-emerald-700">{avgRating.toFixed(2)} / 5</p>
          <p className="text-xs text-saveo-emerald-700/40">{avgRatingAgg._count} total responses</p>
        </div>

        <div className="rounded-xl2 border border-black/5 bg-white p-5 sm:col-span-2 lg:col-span-2">
          <p className="mb-2 text-xs font-bold uppercase text-saveo-emerald-700/50">Most Common Problem Areas</p>
          <div className="space-y-1.5">
            {categoryBreakdown.map((c) => (
              <div key={c.category} className="flex items-center justify-between text-sm">
                <span>{c.category}</span>
                <span className="text-saveo-emerald-700/60">
                  {c._count} responses · avg {(c._avg.rating ?? 0).toFixed(1)}★
                </span>
              </div>
            ))}
            {categoryBreakdown.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No feedback yet.</p>}
          </div>
        </div>
      </div>

      <h2 className="mb-3 font-bold">Latest Feedback</h2>
      <div className="space-y-3">
        {feedbackList.map((f) => (
          <div key={f.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-saveo-gold-500">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-saveo-emerald-700/70">{f.category}</span>
              </div>
              <span className="text-xs text-saveo-emerald-700/40">{new Date(f.createdAt).toLocaleString("en-GB")}</span>
            </div>
            {f.comment && <p className="mt-2 text-sm text-saveo-emerald-700/80">{f.comment}</p>}
            <p className="mt-1 text-xs text-saveo-emerald-700/40">
              {f.user ? (f.user.name ?? f.user.email) : "Anonymous"} · {f.page}
            </p>
          </div>
        ))}
        {feedbackList.length === 0 && (
          <div className="rounded-xl2 border border-black/5 bg-white p-10 text-center text-saveo-emerald-700/40">
            No feedback submitted yet.
          </div>
        )}
      </div>
    </div>
  );
}
