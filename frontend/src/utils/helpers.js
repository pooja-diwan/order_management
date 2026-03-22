export const STATUS_META = {
    PENDING: {
        label: "Pending",
        color: "text-gold",
        bg: "bg-amber-900/30",
        border: "border-amber-700/40",
        dot: "bg-gold",
    },
    PROCESSING: {
        label: "Processing",
        color: "text-sky",
        bg: "bg-sky-900/30",
        border: "border-sky-700/40",
        dot: "bg-sky",
    },
    SHIPPED: {
        label: "Shipped",
        color: "text-accent-light",
        bg: "bg-indigo-900/30",
        border: "border-indigo-700/40",
        dot: "bg-accent-light",
    },
    DELIVERED: {
        label: "Delivered",
        color: "text-emerald",
        bg: "bg-emerald-900/30",
        border: "border-emerald-700/40",
        dot: "bg-emerald",
    },
    CANCELLED: {
        label: "Cancelled",
        color: "text-rose",
        bg: "bg-rose-900/30",
        border: "border-rose-700/40",
        dot: "bg-rose",
    },
};

export const ALL_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

export function formatDate(iso) {
    return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function shortId(id) {
    return id.slice(0, 8).toUpperCase();
}