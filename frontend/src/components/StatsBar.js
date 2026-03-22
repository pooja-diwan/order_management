import { useEffect, useState } from "react";
import { ordersApi } from "../utils/api";
import { formatCurrency } from "../utils/helpers";
import { TrendingUp, Package, ShoppingCart, Truck } from "lucide-react";

const STAT_CARDS = [
  { key: "total_orders", label: "Total Orders", icon: ShoppingCart, color: "text-accent-light" },
  { key: "revenue", label: "Total Revenue", icon: TrendingUp, color: "text-emerald" },
  { key: "pending", label: "Pending", icon: Package, color: "text-gold" },
  { key: "shipped", label: "Shipped", icon: Truck, color: "text-sky" },
];

export default function StatsBar() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () =>
      ordersApi
        .stats()
        .then((s) => {
          setError(false);
          setStats({
            total_orders: s.total_orders,
            revenue: s.total_revenue,
            pending: s.by_status?.PENDING || 0,
            shipped: s.by_status?.SHIPPED || 0,
          });
        })
        .catch(() => {
          // Keep previous values if already loaded; show dashes on first failure
          setError(true);
          if (!stats) setStats({ total_orders: "–", revenue: "–", pending: "–", shipped: "–" });
        });
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="glass rounded-xl p-4 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-xs font-body uppercase tracking-wider">{label}</span>
            <Icon size={15} className={color} />
          </div>
          {stats ? (
            <>
              <p className={`font-display text-2xl font-bold ${color}`}>
                {key === "revenue" && stats[key] !== "–"
                  ? formatCurrency(stats[key])
                  : stats[key]}
              </p>
              {error && (
                <p className="text-muted text-xs mt-1 opacity-60">API offline</p>
              )}
            </>
          ) : (
            <div className="shimmer h-7 w-20 rounded-md" />
          )}
        </div>
      ))}
    </div>
  );
}