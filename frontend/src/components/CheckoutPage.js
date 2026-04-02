import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Smartphone, Truck, CheckCircle, ArrowLeft, ShoppingBag, MapPin } from "lucide-react";
import { checkoutApi } from "../utils/api";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { formatCurrency } from "../utils/helpers";
import toast from "react-hot-toast";

const PAYMENT_METHODS = [
  { id: "COD",  label: "Cash on Delivery",  icon: <Truck size={18} />,      desc: "Pay when order is delivered" },
  { id: "UPI",  label: "UPI / Net Banking",  icon: <Smartphone size={18} />, desc: "GPay, PhonePe, Paytm, etc." },
  { id: "CARD", label: "Credit / Debit Card",icon: <CreditCard size={18} />, desc: "Visa, Mastercard, Rupay" },
];

export default function CheckoutPage() {
  const { cartItems, cartTotal, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress]   = useState("");
  const [payment, setPayment]   = useState("COD");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(null);

  // Dummy card/UPI details
  const [cardNum, setCardNum] = useState("");
  const [upiId, setUpiId]     = useState("");

  const handlePlaceOrder = async () => {
    if (!address.trim()) { toast.error("Please enter a shipping address"); return; }
    if (cartItems.length === 0) { toast.error("Your cart is empty"); return; }
    if (payment === "CARD" && cardNum.length < 8) { toast.error("Please enter a valid card number"); return; }
    if (payment === "UPI" && !upiId.includes("@")) { toast.error("Please enter a valid UPI ID"); return; }

    setLoading(true);
    try {
      const order = await checkoutApi.checkout(address, payment);
      await fetchCart();
      setSuccess(order);
    } catch (err) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-800/30 border-2 border-emerald flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={36} className="text-emerald" />
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Order Placed! 🎉</h1>
        <p className="text-text-secondary text-sm mb-2">
          Your order <span className="text-accent font-mono">#{success.id.slice(0, 8).toUpperCase()}</span> has been confirmed.
        </p>
        <p className="text-text-secondary text-sm mb-6">
          {payment === "COD"
            ? "You'll pay on delivery."
            : "Payment received. "} We'll ship it soon!
        </p>
        <div className="bg-surface border border-border rounded-2xl p-5 text-left mb-6 space-y-3">
          <p className="text-xs text-muted uppercase tracking-widest font-semibold">Order Summary</p>
          {success.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-secondary">{item.product_name} × {item.quantity}</span>
              <span className="text-text-primary font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm border-t border-border pt-3">
            <span className="font-semibold text-text-primary">Total</span>
            <span className="font-bold text-accent">{formatCurrency(success.total_amount)}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate("/orders")} className="flex-1 py-3 bg-accent hover:bg-accent-light text-white rounded-xl font-semibold text-sm transition-colors">
            View My Orders
          </button>
          <button onClick={() => navigate("/")} className="flex-1 py-3 bg-surface border border-border text-text-secondary hover:text-text-primary rounded-xl font-medium text-sm transition-colors">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Shipping address */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-accent" />
              <h2 className="font-display font-semibold text-text-primary">Delivery Address</h2>
            </div>
            <div className="mb-3 bg-ink/50 border border-border rounded-xl px-3 py-2 text-xs text-muted">
              Delivering to: <span className="text-text-secondary font-medium">{user?.name} ({user?.email})</span>
            </div>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter full shipping address — flat/house no, street, area, city, state, PIN code"
              className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Payment */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-accent" />
              <h2 className="font-display font-semibold text-text-primary">Payment Method</h2>
            </div>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((pm) => (
                <label
                  key={pm.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all
                    ${payment === pm.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/40 bg-ink/50"
                    }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={pm.id}
                    checked={payment === pm.id}
                    onChange={() => setPayment(pm.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payment === pm.id ? "border-accent" : "border-border"}`}>
                    {payment === pm.id && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <span className={payment === pm.id ? "text-accent" : "text-text-secondary"}>{pm.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${payment === pm.id ? "text-accent" : "text-text-primary"}`}>{pm.label}</p>
                    <p className="text-xs text-muted">{pm.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Dummy UPI/Card inputs */}
            {payment === "UPI" && (
              <div className="mt-4">
                <label className="text-xs text-muted block mb-1.5">UPI ID (demo)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full bg-ink border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}
            {payment === "CARD" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-muted block mb-1.5">Card Number (demo)</label>
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNum}
                    onChange={(e) => setCardNum(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())}
                    placeholder="1234 5678 9012 3456"
                    className="w-full bg-ink border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors font-mono"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted block mb-1.5">Expiry</label>
                    <input type="text" placeholder="MM/YY" maxLength={5} className="w-full bg-ink border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted block mb-1.5">CVV</label>
                    <input type="password" placeholder="•••" maxLength={3} className="w-full bg-ink border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
                <p className="text-xs text-muted">⚠️ This is a demo. No real payment is processed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-2xl p-5 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={16} className="text-accent" />
              <h2 className="font-display font-semibold text-text-primary">Order Summary</h2>
            </div>

            <div className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-2 items-start">
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary line-clamp-1">{item.product?.name}</p>
                    <p className="text-xs text-muted">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-text-primary flex-shrink-0">
                    {formatCurrency((item.product?.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Subtotal</span>
                <span className="text-text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Delivery</span>
                <span className="text-emerald font-medium">FREE</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-border pt-3">
                <span className="text-text-primary">Total</span>
                <span className="text-accent">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading || cartItems.length === 0}
              className="w-full mt-5 py-3.5 bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-accent/20 transition-all text-sm"
            >
              {loading ? "Placing Order…" : `Place Order · ${formatCurrency(cartTotal)}`}
            </button>
            <p className="text-xs text-muted text-center mt-3">🔒 Safe & secure checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
}
