import axios from "axios";

const TOKEN_KEY = "orderflow_token";
const USER_KEY  = "orderflow_user";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
    timeout: 10000,
});

// Helper to get current user id
function getUserId() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw)?.id : null;
    } catch {
        return null;
    }
}
function getUserName() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw)?.name : null;
    } catch {
        return null;
    }
}
function getUserEmail() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw)?.email : null;
    } catch {
        return null;
    }
}

// Attach JWT token to every request + user headers
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    const uid   = getUserId();
    const uname = getUserName();
    const uemail = getUserEmail();
    if (uid)    config.headers["X-User-Id"]    = uid;
    if (uname)  config.headers["X-User-Name"]  = uname;
    if (uemail) config.headers["X-User-Email"] = uemail;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        let message = "An unexpected error occurred. Please try again.";
        if (error.response) {
            const detail = error.response.data?.detail;
            if (typeof detail === "string") {
                message = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                message = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
            } else if (error.response.status === 404) {
                message = "Resource not found (404).";
            } else if (error.response.status === 422) {
                message = "Invalid request data (422).";
            } else if (error.response.status >= 500) {
                message = "Server error. Please try again later.";
            }
        } else if (error.request) {
            message = "Cannot reach the server. Check your connection or try again later.";
        }
        const normalised = new Error(message);
        normalised.status = error.response?.status ?? null;
        normalised.originalError = error;
        return Promise.reject(normalised);
    }
);

export const authApi = {
    signup: (name, email, password) =>
        api.post("/auth/signup", { name, email, password }).then((r) => r.data),
    login: (email, password) =>
        api.post("/auth/login", { email, password }).then((r) => r.data),
};

export const chatApi = {
    ask: (question) =>
        api.post("/chat", { question }, { timeout: 30000 }).then((r) => r.data),
};

export const ordersApi = {
    list: (status, user_id) =>
        api.get("/orders", { params: { ...(status ? { status } : {}), ...(user_id ? { user_id } : {}) } }).then((r) => r.data),
    get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
    create: (data) => api.post("/orders", data).then((r) => r.data),
    updateStatus: (id, status) =>
        api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
    cancel: (id) => api.delete(`/orders/${id}/cancel`).then((r) => r.data),
    stats: () => api.get("/stats").then((r) => r.data),
};

export const productsApi = {
    list: (params) => api.get("/products", { params }).then((r) => r.data),
    get: (id) => api.get(`/products/${id}`).then((r) => r.data),
    categories: () => api.get("/products/categories").then((r) => r.data),
};

export const cartApi = {
    get: (userId) => api.get(`/cart/${userId}`).then((r) => r.data),
    add: (product_id, quantity = 1) =>
        api.post("/cart", { product_id, quantity }).then((r) => r.data),
    update: (itemId, quantity) =>
        api.put(`/cart/${itemId}`, { quantity }).then((r) => r.data),
    remove: (itemId) =>
        api.delete(`/cart/${itemId}`).then((r) => r.data),
    clear: (userId) =>
        api.delete(`/cart/clear/${userId}`).then((r) => r.data),
};

export const checkoutApi = {
    checkout: (shipping_address, payment_method) =>
        api.post("/checkout", { shipping_address, payment_method }).then((r) => r.data),
};

export const ratingsApi = {
    getForProduct: (productId) =>
        api.get(`/products/${productId}/ratings`).then((r) => r.data),
    add: (product_id, stars, review) =>
        api.post("/ratings", { product_id, stars, review }).then((r) => r.data),
};

export const returnsApi = {
    getForUser: (userId) =>
        api.get(`/returns/${userId}`).then((r) => r.data),
    create: (orderId, reason, return_type) =>
        api.post(`/orders/${orderId}/return`, { reason, return_type }).then((r) => r.data),
};

export default api;