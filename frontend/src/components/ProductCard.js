import { useState } from "react";
import { ShoppingCart, Star, Check } from "lucide-react";
import { formatCurrency, getDiscountPercent } from "../utils/helpers";
import { useCart } from "../CartContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const discount = getDiscountPercent(product.price, product.original_price);
  const avg      = product.rating_avg || 0;
  const fullStars = Math.floor(avg);

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      toast.success("Added to cart!");
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      toast.error(err.message || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 transition-all cursor-pointer flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-ink/50 h-48">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = `https://placehold.co/400x300/1A1A26/7C3AED?text=${encodeURIComponent(product.name.slice(0,12))}`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={40} className="text-muted" />
          </div>
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-rose text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow">
            -{discount}%
          </div>
        )}

        {/* Category pill */}
        <div className="absolute top-2 right-2 bg-ink/80 backdrop-blur text-text-secondary text-xs px-2 py-0.5 rounded-full border border-border/50">
          {product.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {product.brand && (
          <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">{product.brand}</p>
        )}
        <h3 className="text-sm font-semibold text-text-primary leading-snug mb-2 line-clamp-2 group-hover:text-accent transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star
                  key={s}
                  size={11}
                  className={s <= fullStars ? "fill-amber-400 text-amber-400" : "text-muted"}
                />
              ))}
            </div>
            <span className="text-xs text-muted">({product.rating_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-end gap-2 mb-3">
            <span className="text-lg font-bold text-text-primary">{formatCurrency(product.price)}</span>
            {product.original_price > product.price && (
              <span className="text-xs text-muted line-through mb-0.5">
                {formatCurrency(product.original_price)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={adding || product.stock === 0}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${product.stock === 0
                ? "bg-surface border border-border text-muted cursor-not-allowed"
                : added
                  ? "bg-emerald-600 text-white"
                  : "bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/20 hover:shadow-accent/30"
              }`}
          >
            {product.stock === 0 ? (
              "Out of Stock"
            ) : added ? (
              <><Check size={15} /> Added!</>
            ) : adding ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <><ShoppingCart size={15} /> Add to Cart</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
