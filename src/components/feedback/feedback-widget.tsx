"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { MessageSquarePlus, X, Star } from "lucide-react";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "PRODUCT", label: "Product" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "CHECKOUT", label: "Checkout" },
  { value: "WEBSITE", label: "Website" },
  { value: "OTHER", label: "Other" },
];

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState("WEBSITE");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pathname, rating, category, comment: comment || undefined }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setRating(0);
        setComment("");
      }, 1800);
    } catch {
      toast.error("Could not submit feedback — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  // Hide on admin/supplier areas — this widget is customer-facing only.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/supplier")) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Give feedback"
        className="fixed bottom-5 end-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-saveo-emerald-700 text-white shadow-lg transition-transform hover:scale-105"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 end-5 z-40 w-80 rounded-xl2 bg-white p-5 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-saveo-emerald-700">How are we doing?</h3>
        <button onClick={() => setOpen(false)} aria-label="Close feedback">
          <X className="h-4 w-4 text-saveo-emerald-700/50" />
        </button>
      </div>

      {submitted ? (
        <p className="py-6 text-center text-sm font-semibold text-saveo-emerald-600">Thanks for your feedback! 🙏</p>
      ) : (
        <>
          <div className="mb-3 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`h-7 w-7 ${(hoverRating || rating) >= star ? "fill-saveo-gold-400 text-saveo-gold-400" : "text-black/15"}`}
                />
              </button>
            ))}
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input mb-2 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more (optional)"
            rows={3}
            maxLength={1000}
            className="input mb-3 text-sm"
          />

          <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full text-sm">
            {submitting ? "Sending..." : "Send Feedback"}
          </button>
        </>
      )}
    </div>
  );
}
