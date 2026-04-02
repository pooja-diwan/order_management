import { useState } from "react";
import { Star, X } from "lucide-react";
import { ratingsApi } from "../utils/api";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";

export default function RatingModal({ product, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [stars, setStars]     = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) { toast.error("Please select a star rating"); return; }
    setLoading(true);
    try {
      const result = await ratingsApi.add(product.id, stars, review || null);
      toast.success("Review submitted! Thank you.");
      onSubmitted?.(result);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-ink border border-border rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-display font-bold text-text-primary">Rate this Product</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface text-muted hover:text-text-primary transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex gap-3 items-start">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
              <p className="text-sm font-medium text-text-primary">{product.name}</p>
            </div>

            {/* Stars */}
            <div>
              <p className="text-xs text-muted mb-2">Your Rating *</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setStars(s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={s <= (hovered || stars) ? "fill-amber-400 text-amber-400" : "text-muted"}
                    />
                  </button>
                ))}
              </div>
              {(hovered || stars) > 0 && (
                <p className="text-sm text-amber-400 font-medium mt-1">{labels[hovered || stars]}</p>
              )}
            </div>

            {/* Review text */}
            <div>
              <p className="text-xs text-muted mb-2">Your Review (optional)</p>
              <textarea
                rows={3}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience with this product…"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            {user && (
              <p className="text-xs text-muted">
                Reviewing as <span className="text-text-secondary font-medium">{user.name}</span>
              </p>
            )}
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || stars === 0}
              className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {loading ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
