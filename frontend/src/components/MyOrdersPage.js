import { useState, useEffect, useCallback } from "react";
import {
  Package, XCircle, RotateCcw, RefreshCw, ChevronDown, ChevronUp,
  Clock, CheckCircle2, Truck, AlertCircle
} from "lucide-react";
import { ordersApi, returnsApi } from "../utils/api";
import { useAuth } from "../AuthContext";
import { formatCurrency, formatDate, shortId, STATUS_META } from "../utils/helpers";
import toast from "react-hot-toast";

const STATUS_ICONS = {
  PENDING:    <Clock size={14} />,
  PROCESSING: <RefreshCw size={14} />,
  SHIPPED:    <Truck size={14} />,
  DELIVERED:  <CheckCircle2 size={14} />,
  CANCELLED:  <XCircle size={14} />,
};

function ReturnModal({ order, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [type, setType]     = useState("RETURN");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please state the reason"); return; }
    setLoading(true);
    try {
      await returnsApi.create(order.id, reason, type);
      toast.success(`${type === "RETURN" ? "Return" : "Exchange"} request submitted!`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-ink border border-border rounded-2xl w-full max-w-md shadow-2xl p-6">
          <h2 className="font-display font-bold text-text-primary mb-4">Return / Exchange Request</h2>
          <p className="text-xs text-muted mb-4">Order #{shortId(order.id)}</p>

          <div className="flex gap-3 mb-4">
            {["RETURN", "EXCHANGE"].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${type === t ? "bg-accent/15 border-accent text-accent" : "bg-surface border-border text-text-secondary hover:border-accent/40"}`}
              >
                {t === "RETURN" ? "🔄 Return" : "🔃 Exchange"}
              </button>
            ))}
          </div>

          <label className="text-xs text-muted block mb-1.5">Reason *</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please describe the issue or reason for return/exchange…"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none mb-5"
          />

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-surface border border-border text-text-secondary font-medium text-sm hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-semibold text-sm transition-colors">
              {loading ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function OrderRow({ order, onCancelled, onReturn }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [returnModal, setReturnModal] = useState(false);

  const meta = STATUS_META[order.status] || STATUS_META.PENDING;
  const canCancel = ["PENDING", "PROCESSING"].includes(order.status);
  const canReturn = order.status === "DELIVERED";

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      const updated = await ordersApi.cancel(order.id);
      toast.success("Order cancelled");
      onCancelled(updated);
    } catch (err) {
      toast.error(err.message || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted font-mono">#{shortId(order.id)}</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">{formatDate(order.created_at)}</p>
        </div>

        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
          {STATUS_ICONS[order.status]}
          {meta.label}
        </span>

        <span className="text-base font-bold text-text-primary">{formatCurrency(order.total_amount)}</span>

        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose/15 border border-rose/30 text-rose hover:bg-rose/25 transition-colors disabled:opacity-50"
            >
              <XCircle size={12} />
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}
          {canReturn && (
            <button
              onClick={() => setReturnModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky/10 border border-sky/30 text-sky hover:bg-sky/20 transition-colors"
            >
              <RotateCcw size={12} />
              Return / Exchange
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-xl hover:bg-ink text-muted hover:text-text-primary transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Items */}
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-3 font-semibold">Items</p>
            <div className="space-y-2">
              {(order.items || []).map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{item.product_name} × {item.quantity}</span>
                  <span className="text-text-primary font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted mb-1">Shipping address</p>
              <p className="text-text-secondary">{order.shipping_address}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Payment</p>
              <p className="text-text-secondary">{order.payment_method || "COD"}</p>
              <span className={`text-xs font-medium ${order.payment_status === "PAID" ? "text-emerald" : "text-gold"}`}>
                {order.payment_status || "PENDING"}
              </span>
            </div>
          </div>

          {/* Status timeline */}
          {order.status_history?.length > 0 && (
            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-3 font-semibold">Timeline</p>
              <div className="space-y-2">
                {order.status_history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="text-muted whitespace-nowrap">{formatDate(h.timestamp)}</span>
                    <span className="text-text-secondary">
                      <span className="font-semibold text-text-primary">{h.status}</span> — {h.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {returnModal && (
        <ReturnModal
          order={order}
          onClose={() => setReturnModal(false)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await ordersApi.list(filter || undefined, user.id);
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCancelled = (updated) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const FILTER_OPTIONS = [
    { value: "", label: "All" },
    { value: "PENDING",    label: "Pending" },
    { value: "PROCESSING", label: "Processing" },
    { value: "SHIPPED",    label: "Shipped" },
    { value: "DELIVERED",  label: "Delivered" },
    { value: "CANCELLED",  label: "Cancelled" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">My Orders</h1>
          <p className="text-text-secondary text-sm mt-1">{user?.name}'s order history</p>
        </div>
        <button onClick={fetchOrders} className="p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
              ${filter === value
                ? "bg-accent/20 border-accent/50 text-accent"
                : "bg-surface border-border text-text-secondary hover:border-border/80 hover:text-text-primary"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4 border border-border">
            <Package size={24} className="text-muted" />
          </div>
          <p className="font-display text-text-primary font-semibold mb-1">No orders yet</p>
          <p className="text-text-secondary text-sm">Your placed orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onCancelled={handleCancelled}
              onReturn={fetchOrders}
            />
          ))}
        </div>
      )}
    </div>
  );
}
