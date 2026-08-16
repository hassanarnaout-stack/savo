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

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <section className="savo-pdp-section">
      <div className="savo-pdp-section-head">
        <div className="savo-products-eyebrow">Reviews</div>
        <div className="savo-pdp-section-title-row">
          <h2 className="savo-pdp-section-title">Customer Experiences</h2>
          {isSignedIn && <button onClick={() => setShowForm(!showForm)} className="savo-pdp-outline-btn">Write a Review</button>}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="savo-pdp-review-form">
          <div className="savo-pdp-review-form-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "is-active" : ""}>★</button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." rows={3} />
          <button type="submit" disabled={saving} className="savo-pdp-solid-btn">Submit Review</button>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="savo-pdp-reviews-empty">
          <div className="savo-pdp-reviews-empty-icon">⬡</div>
          <div className="savo-pdp-reviews-empty-title">No reviews yet</div>
          <div className="savo-pdp-reviews-empty-copy">Be the first to share your experience with this product.</div>
        </div>
      ) : (
        <div className="savo-pdp-reviews-grid">
          <div className="savo-pdp-reviews-summary">
            <div className="savo-pdp-reviews-summary-num">{avgRating!.toFixed(1)}</div>
            <span className="savo-pdp-stars">{"★".repeat(Math.round(avgRating!))}{"☆".repeat(5 - Math.round(avgRating!))}</span>
            <div className="savo-pdp-reviews-summary-count">{reviews.length.toLocaleString()} reviews</div>
          </div>
          <div className="savo-pdp-review-list">
            {reviews.map((r) => (
              <div key={r.id} className="savo-pdp-review-card">
                <div className="savo-pdp-review-card-head">
                  <div className="savo-pdp-review-avatar">{(r.user.name ?? "S")[0]}</div>
                  <div>
                    <div className="savo-pdp-review-name">{r.user.name ?? "Savo Customer"}</div>
                    {r.isVerifiedPurchase && <div className="savo-pdp-review-verified"><ShieldCheck size={11} /> Verified Purchase</div>}
                  </div>
                  <span className="savo-pdp-stars savo-pdp-stars--sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                {r.comment && <p className="savo-pdp-review-text">{r.comment}</p>}
                {r.media.length > 0 && (
                  <div className="savo-pdp-review-media">
                    {r.media.map((m, i) => <img key={i} src={m.url} alt="" />)}
                  </div>
                )}
                {r.replies.map((reply, i) => (
                  <div key={i} className="savo-pdp-review-reply"><strong>{reply.authorLabel}:</strong> {reply.content}</div>
                ))}
                <button onClick={() => vote(r.id)} className="savo-pdp-review-helpful"><ThumbsUp size={13} /> Helpful ({r.helpfulCount})</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
