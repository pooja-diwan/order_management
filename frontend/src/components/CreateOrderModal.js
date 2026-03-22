import { useState } from "react";
import { ordersApi } from "../utils/api";
import toast from "react-hot-toast";
import { X, Plus, Trash2, ShoppingBag } from "lucide-react";

const emptyItem = () => ({
  product_id: `P${String(Math.floor(Math.random() * 9000) + 1000)}`,
  product_name: "",
  quantity: 1,
  unit_price: "",
});

const SAMPLE_PRODUCTS = [
  { product_id: "P001", product_name: "Mechanical Keyboard", unit_price: 129.99 },
  { product_id: "P002", product_name: "USB-C Hub", unit_price: 39.99 },
  { product_id: "P003", product_name: "Noise-Cancelling Headphones", unit_price: 249.00 },
  { product_id: "P004", product_name: "Standing Desk", unit_price: 499.00 },
  { product_id: "P005", product_name: "Monitor Arm", unit_price: 89.00 },
  { product_id: "P006", product_name: "Webcam 4K", unit_price: 199.00 },
  { product_id: "P007", product_name: "Ergonomic Chair", unit_price: 349.00 },
];

export default function CreateOrderModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    shipping_address: "",
  });
  const [items, setItems] = useState([emptyItem()]);
  const [loading, setLoading] = useState(false);

  const updateField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updateItem = (i, k, v) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [k]: v } : item)));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const pickSample = (i, product) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, ...product } : item
      )
    );
  };

  const total = items.reduce(
    (acc, item) => acc + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );

  const submit = async () => {
    if (!form.customer_name || !form.customer_email || !form.shipping_address) {
      toast.error("Please fill in all customer details");
      return;
    }
    if (items.some((i) => !i.product_name || !i.unit_price)) {
      toast.error("Please complete all item details");
      return;
    }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        ...form,
        items: items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      });
      toast.success(`Order #${order.id.slice(0, 8).toUpperCase()} created!`);
      onCreated(order);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border sticky top-0 glass z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <ShoppingBag size={16} className="text-accent-light" />
            </div>
            <h2 className="font-display font-bold text-lg text-text-primary">New Order</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Customer info */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-3">Customer Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "customer_name", label: "Full Name", type: "text", placeholder: "Jane Doe" },
                { key: "customer_email", label: "Email", type: "email", placeholder: "jane@example.com" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-text-secondary mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary
                      placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Shipping Address</label>
                <input
                  type="text"
                  value={form.shipping_address}
                  onChange={(e) => updateField("shipping_address", e.target.value)}
                  placeholder="42 Main St, San Francisco, CA 94105"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary
                    placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted uppercase tracking-wider">Order Items</p>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-accent-light hover:text-accent transition-colors"
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            {/* Quick pick */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SAMPLE_PRODUCTS.map((p) => (
                <button
                  key={p.product_id}
                  onClick={() => {
                    const empty = items.findIndex((i) => !i.product_name);
                    if (empty >= 0) pickSample(empty, p);
                    else { addItem(); setTimeout(() => pickSample(items.length, p), 0); }
                  }}
                  className="px-2 py-1 rounded-md bg-accent-dim/40 text-accent-light text-xs hover:bg-accent/20 transition-colors border border-accent/20"
                >
                  + {p.product_name}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-5 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary
                      placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                    placeholder="Product name"
                    value={item.product_name}
                    onChange={(e) => updateItem(i, "product_name", e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    className="col-span-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary
                      placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-center"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="col-span-4 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary
                      placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                    placeholder="Unit price"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                  />
                  <button
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="col-span-1 flex justify-center text-muted hover:text-rose disabled:opacity-20 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-3">
              <p className="text-sm text-text-secondary">
                Total:{" "}
                <span className="text-emerald font-bold font-display text-base">
                  ${total.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-sm font-medium
              transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Placing…" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
