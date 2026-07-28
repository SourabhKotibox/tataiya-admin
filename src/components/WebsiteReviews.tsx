import { useMemo, useState } from "react";
import { Star, MessageSquareQuote, Trash2, Send, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useGetAppReviews, createAppReview, deleteAppReview, getImageUrl } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface WebsiteReviewsProps {
  user: any;
  onSignInRequired: () => void;
  /** compact = profile / embedded; full = watch page / home */
  variant?: "full" | "compact";
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Okay",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

function Stars({
  value,
  size = "sm",
  interactive = false,
  onChange,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  const sizeCls = size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const cls = `${sizeCls} transition-transform ${
          filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-zinc-600"
        } ${interactive ? "hover:scale-110 cursor-pointer" : ""}`;
        if (interactive) {
          return (
            <button key={star} type="button" onClick={() => onChange?.(star)} className="p-0.5" aria-label={`${star} stars`}>
              <Star className={cls} />
            </button>
          );
        }
        return <Star key={star} className={cls} />;
      })}
    </div>
  );
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function userMatchesReview(review: any, user: any) {
  if (!user) return false;
  const uid = String(user._id || user.id || "");
  const rid = String(review.userId?._id || review.userId?.id || review.userId || "");
  return !!uid && uid === rid;
}

export function WebsiteReviews({ user, onSignInRequired, variant = "full" }: WebsiteReviewsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useGetAppReviews(page);
  const reviews = data?.data || [];
  const stats = data?.stats || { averageRating: 0, totalReviews: 0, distribution: {} };
  const pagination = data?.pagination;
  const distribution: Record<number, number> = stats.distribution || {};
  const totalForBars = Math.max(1, Number(stats.totalReviews) || 0);
  const avg = Number(stats.averageRating) || 0;

  const hasUserReviewed = useMemo(
    () => reviews.some((r: any) => userMatchesReview(r, user)),
    [reviews, user]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onSignInRequired();
      return;
    }
    if (!comment.trim()) {
      toast({ title: "Please write a short review", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      await createAppReview({ rating, comment: comment.trim() });
      toast({ title: "Thanks for your review!" });
      setComment("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["app-reviews"] });
    } catch (err: any) {
      toast({ title: "Could not submit review", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete your review?")) return;
    try {
      await deleteAppReview(reviewId);
      toast({ title: "Review deleted" });
      queryClient.invalidateQueries({ queryKey: ["app-reviews"] });
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const isCompact = variant === "compact";

  return (
    <section className={`w-full ${isCompact ? "" : "mt-2"}`}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 ${isCompact ? "mb-5" : "mb-7"}`}>
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-[10px] font-bold uppercase tracking-[0.16em] mb-2.5">
            <Sparkles className="w-3 h-3" /> Community
          </div>
          <h2 className={`text-white font-black tracking-tight ${isCompact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
            What viewers say
          </h2>
          <p className="text-white/50 text-sm mt-1.5 max-w-md">
            Honest ratings from people watching on Tataiya.
          </p>
        </div>
      </div>

      {/* Stats + form */}
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-[#121018] via-[#0c0c12] to-[#08080c] ${
          isCompact ? "p-4 sm:p-5 mb-5" : "p-5 sm:p-7 mb-8"
        }`}
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_1fr] gap-6 lg:gap-8">
          {/* Score card */}
          <div className="flex flex-col items-center justify-center text-center rounded-2xl bg-black/35 border border-white/8 px-4 py-5">
            <p className="text-5xl sm:text-6xl font-black text-white tabular-nums leading-none tracking-tight">
              {avg > 0 ? avg.toFixed(1) : "—"}
            </p>
            <div className="mt-3">
              <Stars value={Math.round(avg)} size="md" />
            </div>
            <p className="text-white/55 text-xs font-semibold mt-2.5">
              {stats.totalReviews || 0} {stats.totalReviews === 1 ? "review" : "reviews"}
            </p>

            {/* Distribution */}
            <div className="w-full mt-5 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(distribution[star] || 0);
                const pct = Math.round((count / totalForBars) * 100);
                return (
                  <div key={star} className="flex items-center gap-2 text-[10px] text-white/50">
                    <span className="w-3 tabular-nums font-bold text-white/70">{star}</span>
                    <Star className="w-2.5 h-2.5 fill-amber-400/80 text-amber-400/80" />
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Write review */}
          <div className="min-w-0">
            {!hasUserReviewed ? (
              <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <p className="text-white font-bold text-sm mb-3">Share your experience</p>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div
                    className="flex items-center gap-1"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onClick={() => setRating(star)}
                        className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                        aria-label={`${star} stars`}
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                            star <= (hoverRating || rating)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-transparent text-zinc-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-amber-300/90 text-xs font-bold tracking-wide">
                    {RATING_LABELS[hoverRating || rating]}
                  </span>
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={user ? "What did you like about Tataiya? Streaming, movies, quality…" : "Sign in to leave a review"}
                  maxLength={500}
                  rows={isCompact ? 3 : 4}
                  disabled={!user}
                  className="w-full flex-1 min-h-[88px] bg-black/40 border border-white/10 focus:border-amber-400/40 rounded-xl sm:rounded-2xl p-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none resize-none transition-colors"
                />
                <div className="flex items-center justify-between gap-3 mt-3">
                  <p className="text-[11px] text-white/35 tabular-nums">{comment.length}/500</p>
                  <button
                    type="submit"
                    disabled={!user || isSubmitting || !comment.trim()}
                    onClick={() => {
                      if (!user) onSignInRequired();
                    }}
                    className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none shadow-lg shadow-amber-900/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? "Sending…" : user ? "Post review" : "Sign in to review"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-amber-400/25 bg-amber-400/[0.04] px-6 py-8">
                <div className="w-12 h-12 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-3">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <p className="text-white font-bold text-sm">Thanks for reviewing Tataiya</p>
                <p className="text-white/45 text-xs mt-1.5 max-w-xs">
                  Your feedback helps us improve streaming for everyone.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className={isCompact ? "space-y-3" : "space-y-3.5"}>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-white/8 bg-white/[0.02]">
            <MessageSquareQuote className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/70 text-sm font-semibold">No reviews yet</p>
            <p className="text-white/40 text-xs mt-1">Be the first to share how Tataiya feels.</p>
          </div>
        ) : (
          <>
            <div className={`grid gap-3 ${isCompact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {reviews.map((review: any) => {
                const name = review.userId?.name || "Viewer";
                const avatar = review.userId?.avatar ? getImageUrl(review.userId.avatar) : "";
                const mine = userMatchesReview(review, user);
                return (
                  <article
                    key={review._id}
                    className="group relative rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/12 p-4 sm:p-5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-amber-800 flex items-center justify-center flex-shrink-0 text-black font-black text-sm border border-white/10">
                        {avatar ? (
                          <img src={avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-white text-sm font-bold truncate">{name}</h4>
                              {mine && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/25">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Stars value={review.rating} size="sm" />
                              <span className="text-white/35 text-[11px]">{relativeDate(review.createdAt)}</span>
                            </div>
                          </div>
                          {mine && (
                            <button
                              type="button"
                              onClick={() => handleDelete(review._id)}
                              className="p-2 rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {review.comment && (
                          <p className="text-white/70 text-sm leading-relaxed mt-3 line-clamp-5">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {pagination?.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-xl border border-white/12 text-white/70 hover:text-white hover:border-white/25 disabled:opacity-30 flex items-center justify-center transition-all"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white/50 text-xs font-semibold tabular-nums px-2">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="w-10 h-10 rounded-xl border border-white/12 text-white/70 hover:text-white hover:border-white/25 disabled:opacity-30 flex items-center justify-center transition-all"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
