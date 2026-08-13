"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThumbsUp, ShieldCheck } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  user: { name: string | null };
  media: { url: string; type: string }[];
  replies: { authorLabel: string; content: string }[];
}

export function ReviewsSection({ productId, reviews, isSignedIn }: { productId: string; reviews: Review[]; isSignedIn: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit review");
      toast.success(data.review.status === "PENDING" ? "Review submitted — pending moderation" : "Review posted");
      setComment("");
      setShowForm(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not submit review");
    } finally {
      setSaving(false);
    }
  }

  async function vote(reviewId: string) {
    if (!isSignedIn) return toast.error("Sign in to vote");
    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not vote");
    }
  }

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-saveo-emerald-700">
          ⭐ Reviews {avgRating && `(${avgRating}/5 · ${reviews.length})`}
        </h2>
        {isSignedIn && (
          <button onClick={() => setShowForm(!showForm)} className="btn-outline text-sm">Write a Review</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 rounded-xl2 border border-black/5 bg-white p-4">
          <div className="mb-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-saveo-gold-500" : "text-black/10"}`}>★</button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." rows={3} className="input mb-2 text-sm" />
          <button type="submit" disabled={saving} className="btn-primary text-sm">Submit Review</button>
        </form>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl2 border border-black/5 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-saveo-gold-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="text-sm font-semibold">{r.user.name ?? "Savo Customer"}</span>
                {r.isVerifiedPurchase && (
                  <span className="flex items-center gap-1 rounded-full bg-saveo-emerald-50 px-2 py-0.5 text-[10px] font-bold text-saveo-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Verified Purchase
                  </span>
                )}
              </div>
            </div>
            {r.comment && <p className="mb-2 text-sm text-saveo-emerald-700/80">{r.comment}</p>}
            {r.media.length > 0 && (
              <div className="mb-2 flex gap-2">
                {r.media.map((m, i) => <img key={i} src={m.url} alt="" className="h-16 w-16 rounded-lg object-cover" />)}
              </div>
            )}
            {r.replies.map((reply, i) => (
              <div key={i} className="mt-2 rounded-lg bg-black/[0.02] p-2.5 text-xs">
                <span className="font-bold text-saveo-emerald-700">{reply.authorLabel}:</span> {reply.content}
              </div>
            ))}
            <button onClick={() => vote(r.id)} className="mt-2 flex items-center gap-1 text-xs text-saveo-emerald-700/50 hover:text-saveo-emerald-700">
              <ThumbsUp className="h-3.5 w-3.5" /> Helpful ({r.helpfulCount})
            </button>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No reviews yet — be the first to share your experience.</p>}
      </div>
    </section>
  );
}
