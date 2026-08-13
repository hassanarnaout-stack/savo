import { Star, MessageSquareHeart } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  user: { name: string | null };
  product: { name: string };
}

export function ReviewsSection({
  reviews,
  locale,
  emptyMessage,
}: {
  reviews: Review[];
  locale: string;
  emptyMessage: string;
}) {
  if (reviews.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 p-10 text-center">
        <MessageSquareHeart className="h-8 w-8 text-saveo-emerald-700/30" />
        <p className="max-w-sm text-sm text-saveo-emerald-700/50">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((r) => (
        <div key={r.id} className="card p-5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-saveo-gold-400 text-saveo-gold-400" : "text-black/10"}`} />
            ))}
          </div>
          {r.comment && <p className="mt-3 line-clamp-4 text-sm text-saveo-emerald-800/80">"{r.comment}"</p>}
          <p className="mt-3 text-xs font-semibold text-saveo-emerald-700/60">
            {r.user.name ?? (locale === "ar" ? "متسوق سافو" : "Savo shopper")} · {r.product.name}
          </p>
        </div>
      ))}
    </div>
  );
}
