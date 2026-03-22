import { useState, useEffect, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import StatsBar from "./components/StatsBar";
import OrderCard from "./components/OrderCard";
import CreateOrderModal from "./components/CreateOrderModal";
import ChatWidget from "./components/ChatWidget";
import { ordersApi } from "./utils/api";
import { ALL_STATUSES } from "./utils/helpers";
import { Plus, RefreshCw, Search, LayoutGrid, Zap } from "lucide-react";
import "./index.css";

const FILTER_OPTIONS = [{ value: "", label: "All" }, ...ALL_STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))];

export default function App() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const data = await ordersApi.list(filter || undefined);
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadOrders();
  }, [loadOrders]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => loadOrders(), 30000);
    return () => clearInterval(t);
  }, [loadOrders]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await ordersApi.updateStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast.success(`Order moved to ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  };

  const handleCancel = async (id) => {
    try {
      const updated = await ordersApi.cancel(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Cancel failed");
    }
  };

  const handleCreated = (order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const visible = orders.filter(
    (o) =>
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-ink">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#1A1A26", color: "#F1F5F9", border: "1px solid #2A2A3A", fontFamily: "'DM Sans', sans-serif" },
          success: { iconTheme: { primary: "#10B981", secondary: "#0A0A0F" } },
          error: { iconTheme: { primary: "#F43F5E", secondary: "#0A0A0F" } },
        }}
      />

      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-sky/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-accent" />
              <span className="text-xs font-mono text-accent uppercase tracking-widest">OrderFlow</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-text-primary leading-tight">
              Order Management
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Real-time order processing dashboard
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-white rounded-xl
              font-medium text-sm transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30"
          >
            <Plus size={16} />
            New Order
          </button>
        </div>

        {/* Stats */}
        <StatsBar key={orders.length} />

        {/* Filters & search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or order ID…"
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary
                placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border
                  ${filter === value
                    ? "bg-accent/20 border-accent/50 text-accent-light"
                    : "bg-surface border-border text-text-secondary hover:border-border/80 hover:text-text-primary"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadOrders(true)}
            className="p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Order list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4 border border-border">
              <LayoutGrid size={24} className="text-muted" />
            </div>
            <p className="font-display text-text-primary font-semibold mb-1">No orders found</p>
            <p className="text-text-secondary text-sm">
              {search ? "Try a different search term" : "Create your first order to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                onCancel={handleCancel}
              />
            ))}
            <p className="text-center text-xs text-muted pt-2">
              Showing {visible.length} order{visible.length !== 1 ? "s" : ""}
              {filter ? ` · filtered by ${filter}` : ""}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <CreateOrderModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Gemini AI Chat Widget */}
      <ChatWidget />
    </div>
  );
}
