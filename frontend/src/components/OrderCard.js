import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { formatCurrency, formatDate, shortId } from "../utils/helpers";
import { ChevronDown, ChevronUp, MapPin, Mail, Package, Clock } from "lucide-react";

export default function OrderCard({ order, onStatusChange, onCancel }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass rounded-xl overflow-hidden animate-fade-up transition-all duration-200 hover:border-accent/30">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-xs text-muted">#{shortId(order.id)}</p>
            <p className="font-display font-semibold text-text-primary">{order.customer_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-sm hidden sm:block">
            {formatCurrency(order.total_amount)}
          </span>
          <StatusBadge status={order.status} pulse />
          {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4 animate-fade-up">
          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 text-text-secondary">
              <Mail size={14} className="mt-0.5 shrink-0 text-accent-light" />
              <span>{order.customer_email}</span>
            </div>
            <div className="flex items-start gap-2 text-text-secondary">
              <MapPin size={14} className="mt-0.5 shrink-0 text-gold" />
              <span>{order.shipping_address}</span>
            </div>
            <div className="flex items-start gap-2 text-text-secondary">
              <Clock size={14} className="mt-0.5 shrink-0 text-sky" />
              <span>Placed {formatDate(order.created_at)}</span>
            </div>
            <div className="flex items-start gap-2 text-text-secondary">
              <Package size={14} className="mt-0.5 shrink-0 text-emerald" />
              <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Product</th>
                  <th className="text-center px-4 py-2 font-medium">Qty</th>
                  <th className="text-right px-4 py-2 font-medium">Price</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-4 py-2.5 text-text-primary">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-center text-text-secondary">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-2.5 text-right text-accent-light font-medium">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-surface/50">
                  <td colSpan={3} className="px-4 py-2.5 text-right text-text-secondary font-medium text-xs uppercase tracking-wider">
                    Order Total
                  </td>
                  <td className="px-4 py-2.5 text-right text-emerald font-bold font-display">
                    {formatCurrency(order.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Status history */}
          {order.status_history?.length > 0 && (
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-2">Status History</p>
              <div className="flex flex-col gap-1">
                {[...order.status_history].reverse().map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-text-secondary">
                    <StatusBadge status={h.status} />
                    <span>{formatDate(h.timestamp)}</span>
                    <span className="text-muted">— {h.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {["PROCESSING", "SHIPPED", "DELIVERED"].map((s) => {
              const disabled =
                order.status === s ||
                order.status === "CANCELLED" ||
                order.status === "DELIVERED";
              return (
                <button
                  key={s}
                  disabled={disabled}
                  onClick={() => onStatusChange(order.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${disabled
                      ? "border-border text-muted cursor-not-allowed opacity-40"
                      : "border-accent/40 text-accent-light hover:bg-accent/10 hover:border-accent"
                    }`}
                >
                  → {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              );
            })}
            {order.status === "PENDING" && (
              <button
                onClick={() => onCancel(order.id)}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium border border-rose/30 text-rose hover:bg-rose/10 transition-all"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
