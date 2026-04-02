import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, ShoppingCart, Check, ArrowLeft, Package, MessageSquare } from "lucide-react";
import { productsApi, ratingsApi } from "../utils/api";
import { formatCurrency, getDiscountPercent, formatDate } from "../utils/helpers";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import RatingModal from "./RatingModal";
import toast from "react-hot-toast";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct]   = useState(null);
  const [ratings, setRatings]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [added, setAdded]       = useState(false);
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prod, rats] = await Promise.all([
          productsApi.get(id),
          ratingsApi.getForProduct(id),
        ]);
        setProduct(prod);
        setRatings(rats);
      } catch {
        toast.error("Product not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      toast.success("Added to cart!");
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRated = (newRating) => {
    setRatings((prev) => {
      const existing = prev.findIndex((r) => r.user_id === user?.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newRating;
        return updated;
      }
      return [newRating, ...prev];
    });
    if (product) {
      const count = ratings.length + (ratings.findIndex(r => r.user_id === user?.id) >= 0 ? 0 : 1);
      const total = ratings.reduce((s, r) => s + (r.user_id === user?.id ? newRating.stars : r.stars), 0) + (ratings.findIndex(r => r.user_id === user?.id) >= 0 ? 0 : newRating.stars);
      setProduct(p => ({ ...p, rating_avg: +(total / count).toFixed(1), rating_count: count }));
    }
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="shimmer h-80 rounded-2xl" />
        <div className="space-y-4">
          <div className="shimmer h-8 rounded-xl w-3/4" />
          <div className="shimmer h-6 rounded-xl w-1/2" />
          <div className="shimmer h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (!product) return null;

  const discount = getDiscountPercent(product.price, product.original_price);
  const avg = product.rating_avg || 0;
  const ratingsCount = product.rating_count || 0;

  const ratingBuckets = [5,4,3,2,1].map((s) => {
    const count = ratings.filter(r => r.stars === s).length;
    const pct   = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
    return { stars: s, count, pct };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Store
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Image */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-80 md:h-96 object-cover"
              onError={(e) => { e.target.src = `https://placehold.co/600x400/1A1A26/7C3AED?text=${encodeURIComponent(product.name.slice(0,15))}`; }}
            />
          ) : (
            <div className="w-full h-80 flex items-center justify-center">
              <Package size={64} className="text-muted" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {product.brand && (
            <p className="text-accent font-semibold text-sm uppercase tracking-wider">{product.brand}</p>
          )}
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary leading-tight">
            {product.name}
          </h1>

          {/* Rating summary */}
          {ratingsCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={14} className={s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted"} />
                ))}
              </div>
              <span className="text-sm font-semibold text-text-primary">{avg}</span>
              <span className="text-xs text-muted">({ratingsCount} ratings)</span>
            </div>
          )}

          <p className="text-text-secondary text-sm leading-relaxed">{product.description}</p>

          {/* Price */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-text-primary">{formatCurrency(product.price)}</span>
            {product.original_price > product.price && (
              <>
                <span className="text-lg text-muted line-through">{formatCurrency(product.original_price)}</span>
                <span className="text-sm bg-rose/15 text-rose font-bold px-2 py-0.5 rounded-lg">
                  {discount}% off
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <p className={`text-sm font-medium ${product.stock > 0 ? "text-emerald" : "text-rose"}`}>
            {product.stock > 0 ? `✓ In Stock (${product.stock} left)` : "✗ Out of Stock"}
          </p>

          {/* Category */}
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs bg-surface border border-border text-text-secondary">
              {product.category}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAdd}
              disabled={adding || product.stock === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all text-sm
                ${product.stock === 0
                  ? "bg-surface border border-border text-muted cursor-not-allowed"
                  : added
                    ? "bg-emerald-600 text-white"
                    : "bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/20"
                }`}
            >
              {added ? <><Check size={16} />Added to Cart</> : adding ? "Adding…" : <><ShoppingCart size={16} />Add to Cart</>}
            </button>
            <button
              onClick={() => setShowRating(true)}
              className="flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-xl text-text-secondary hover:text-accent hover:border-accent/40 transition-colors text-sm font-medium"
            >
              <Star size={15} />
              Rate
            </button>
          </div>
        </div>
      </div>

      {/* Ratings Section */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-text-primary">Customer Reviews</h2>
          <button
            onClick={() => setShowRating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent border border-accent/30 rounded-xl hover:bg-accent/25 transition-colors text-sm font-medium"
          >
            <MessageSquare size={14} />
            Write a Review
          </button>
        </div>

        {ratings.length === 0 ? (
          <div className="text-center py-8">
            <Star size={32} className="text-muted mx-auto mb-2" />
            <p className="text-text-secondary text-sm">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Summary */}
            <div className="text-center">
              <div className="text-5xl font-bold text-text-primary mb-1">{avg}</div>
              <div className="flex justify-center mb-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={16} className={s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted"} />
                ))}
              </div>
              <p className="text-xs text-muted">{ratingsCount} reviews</p>
              <div className="mt-4 space-y-1.5">
                {ratingBuckets.map(({ stars, count, pct }) => (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="text-muted w-3">{stars}</span>
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <div className="flex-1 bg-ink rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted w-4">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review list */}
            <div className="md:col-span-2 space-y-4 max-h-80 overflow-y-auto pr-1">
              {ratings.map((r) => (
                <div key={r.id} className="bg-ink rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary text-sm">{r.user_name}</span>
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={11} className={s <= r.stars ? "fill-amber-400 text-amber-400" : "text-muted"} />
                      ))}
                    </div>
                  </div>
                  {r.review && <p className="text-text-secondary text-sm">{r.review}</p>}
                  <p className="text-xs text-muted mt-1">{formatDate(r.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showRating && (
        <RatingModal
          product={product}
          onClose={() => setShowRating(false)}
          onSubmitted={handleRated}
        />
      )}
    </div>
  );
}
