import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
    timeout: 10000,
});

// ── Global error interceptor ──────────────────────────────────────────────────
// Converts every failed request into a normalised Error so callers always get
// a consistent `err.message` and the UI never crashes from undefined accesses.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        let message = "An unexpected error occurred. Please try again.";

        if (error.response) {
            // Server responded with a non-2xx status
            const detail = error.response.data?.detail;
            if (typeof detail === "string") {
                message = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                // FastAPI validation errors come as an array of objects
                message = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
            } else if (error.response.status === 404) {
                message = "Resource not found (404).";
            } else if (error.response.status === 422) {
                message = "Invalid request data (422).";
            } else if (error.response.status >= 500) {
                message = "Server error. Please try again later.";
            }
        } else if (error.request) {
            // Request was made but no response received (network down / backend offline)
            message = "Cannot reach the server. Check your connection or try again later.";
        }

        // Attach normalised message so callers can just use err.message
        const normalised = new Error(message);
        normalised.status = error.response?.status ?? null;
        normalised.originalError = error;
        return Promise.reject(normalised);
    }
);

export const chatApi = {
    ask: (question) =>
        api.post("/chat", { question }, { timeout: 30000 }).then((r) => r.data),
};

export const ordersApi = {
    list: (status) =>
        api.get("/orders", { params: status ? { status } : {} }).then((r) => r.data),

    get: (id) => api.get(`/orders/${id}`).then((r) => r.data),

    create: (data) => api.post("/orders", data).then((r) => r.data),

    updateStatus: (id, status) =>
        api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),

    cancel: (id) => api.delete(`/orders/${id}/cancel`).then((r) => r.data),

    stats: () => api.get("/stats").then((r) => r.data),
};

export default api;