import { X, ShoppingCart, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../CartContext";
import { formatCurrency } from "../utils/helpers";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CartSidebar() {
  const { cartItems, cartTotal, cartOpen, setCartOpen, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  if (!cartOpen) return null;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }
    setCartOpen(false);
    navigate("/checkout");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={() => setCartOpen(false)}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-ink border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-accent" />
            <h2 className="font-display font-bold text-text-primary">Your Cart</h2>
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
              {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
            </span>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="p-2 rounded-xl hover:bg-surface text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
                <ShoppingBag size={24} className="text-muted" />
              </div>
              <p className="font-display text-text-primary font-semibold mb-1">Your cart is empty</p>
              <p className="text-text-secondary text-sm">Add items from the store to get started</p>
              <button
                onClick={() => setCartOpen(false)}
                className="mt-6 px-5 py-2.5 bg-accent hover:bg-accent-light text-white rounded-xl text-sm font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-3 bg-surface rounded-xl p-3 border border-border">
                {item.product?.image_url && (
                  <img
                    src={item.product.image_url}
                    alt={item.product?.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary leading-tight line-clamp-2 mb-1">
                    {item.product?.name || "Product"}
                  </p>
                  <p className="text-accent font-bold text-sm">
                    {formatCurrency(item.product?.price || 0)}
                  </p>
                  {item.product?.original_price > item.product?.price && (
                    <p className="text-xs text-muted line-through">
                      {formatCurrency(item.product.original_price)}
                    </p>
                  )}

                  {/* Qty control */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        item.quantity > 1
                          ? updateItem(item.id, item.quantity - 1)
                          : removeItem(item.id)
                      }
                      className="w-7 h-7 rounded-lg bg-ink border border-border flex items-center justify-center text-muted hover:text-text-primary hover:border-accent/40 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-semibold text-text-primary w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-ink border border-border flex items-center justify-center text-muted hover:text-text-primary hover:border-accent/40 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto p-1.5 text-muted hover:text-rose transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-border px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Subtotal</span>
              <span className="font-display text-xl font-bold text-text-primary">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            <p className="text-xs text-muted">Shipping calculated at checkout</p>
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30"
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
