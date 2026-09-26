import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export const getImageUrl = (url?: string | null): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${BACKEND_URL}${cleanPath}`;
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach JWT from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cityrock_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("cityrock_token");
      localStorage.removeItem("cityrock_user");
      window.dispatchEvent(new CustomEvent("cityrock_unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Typed API helpers ──────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post("/auth/login", data),
  signup: (data: Record<string, unknown>) => api.post("/auth/signup", data),
  verifyEmail: (data: { email: string; otp: string }) => api.post("/auth/verify-email", data),
  resendOtp: (email: string) => api.post("/auth/resend-otp", { email }),
  me: () => api.get("/auth/me"),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data: { token: string; newPassword: string }) => api.post("/auth/reset-password", data),
  uploadAvatar: (formData: FormData) => api.post("/auth/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  removeAvatar: () => api.delete("/auth/avatar"),
};

export const adminApi = {
  getStats: () => api.get("/admin/stats"),
  listTenants: (params?: Record<string, unknown>) => api.get("/admin/tenants", { params }),
  getTenant: (id: string) => api.get(`/admin/tenants/${id}`),
  updateTenant: (id: string, data: Record<string, unknown>) => api.put(`/admin/tenants/${id}`, data),
  updateTenantStatus: (id: string, status: string) => api.patch(`/admin/tenants/${id}/status`, { status }),
  deleteTenant: (id: string) => api.delete(`/admin/tenants/${id}`),
  getPendingPayments: (params?: Record<string, unknown>) => api.get("/admin/payments/pending", { params }),
  reviewPaymentRequest: (id: string, data: { status: string; rejectionReason?: string; crossCheckedWhatsApp?: boolean }) => api.patch(`/admin/payments/${id}/review`, data),
  getPaymentAccounts: () => api.get("/admin/payment-accounts"),
  createPaymentAccount: (data: Record<string, unknown>) => api.post("/admin/payment-accounts", data),
  updatePaymentAccount: (id: string, data: Record<string, unknown>) => api.patch(`/admin/payment-accounts/${id}`, data),
  listTickets: (params?: Record<string, unknown>) => api.get("/admin/tickets", { params }),
  assignTicket: (id: string, agentId: string) => api.patch(`/admin/tickets/${id}/assign`, { agentId }),
  replyToTicket: (id: string, body: string, isInternal?: boolean) => api.post(`/admin/tickets/${id}/reply`, { body, isInternal }),
  updateTicketStatus: (id: string, status: string) => api.patch(`/admin/tickets/${id}/status`, { status }),
  listPlans: () => api.get("/admin/plans"),
  createPlan: (data: Record<string, unknown>) => api.post("/admin/plans", data),
  updatePlan: (id: string, data: Record<string, unknown>) => api.patch(`/admin/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
  listStaff: (params?: Record<string, unknown>) => api.get("/admin/staff", { params }),
  resendStaffInvite: (id: string) => api.post(`/admin/staff/${id}/resend-invite`),
  getPlatformSettings: () => api.get("/admin/platform-settings"),
  updatePlatformSettings: (data: Record<string, unknown>) => api.put("/admin/platform-settings", data),
  uploadPlatformLogo: (formData: FormData) => api.post("/admin/platform-logo", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  removePlatformLogo: () => api.delete("/admin/platform-logo"),
};

export const tenantApi = {
  listStores: (params?: Record<string, unknown>) => api.get("/tenant/stores", { params }),
  createStore: (data: Record<string, unknown>) => api.post("/tenant/stores", data),
  updateStore: (id: string, data: Record<string, unknown>) => api.patch(`/tenant/stores/${id}`, data),
  deleteStore: (id: string) => api.delete(`/tenant/stores/${id}`),
  listStaff: (params?: Record<string, unknown>) => api.get("/tenant/staff", { params }),
  getStaffDetails: (id: string) => api.get(`/tenant/staff/${id}`),
  inviteStaff: (data: Record<string, unknown>) => api.post("/tenant/staff", data),
  updateStaff: (id: string, data: Record<string, unknown>) => api.patch(`/tenant/staff/${id}`, data),
  deleteStaff: (id: string) => api.delete(`/tenant/staff/${id}`),
  deactivateStaff: (id: string) => api.patch(`/tenant/staff/${id}/deactivate`),
  getSubscription: () => api.get("/tenant/subscription"),
  getPlans: () => api.get("/tenant/plans"),
  getPaymentAccounts: () => api.get("/tenant/payment-accounts"),
  uploadPaymentProof: (formData: FormData) => api.post("/tenant/payments/upload-proof", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  submitPaymentProof: (data: FormData | Record<string, unknown>) => {
    if (data instanceof FormData) {
      return api.post("/tenant/payment-proof", data, { headers: { "Content-Type": "multipart/form-data" } });
    }
    return api.post("/tenant/payment-proof", data);
  },
  listTickets: (params?: Record<string, unknown>) => api.get("/tenant/tickets", { params }),
  createTicket: (data: Record<string, unknown>) => api.post("/tenant/tickets", data),
  replyToTicket: (id: string, body: string) => api.post(`/tenant/tickets/${id}/reply`, { body }),
};

export const productApi = {
  list: (params?: Record<string, unknown>) => api.get("/products", { params }),
  create: (data: Record<string, unknown>) => api.post("/products", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  downloadTemplate: () => api.get("/products/import/template", { responseType: "blob" }),
  validateImport: (formData: FormData) => api.post("/products/import/validate", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  commitImport: (data: Record<string, unknown>) => api.post("/products/import/commit", data),
  export: () => api.get("/products/export", { responseType: "blob" }),
};

export const inventoryApi = {
  list: (params?: Record<string, unknown>) => api.get("/inventory", { params }),
  adjust: (id: string, quantity: number) => api.patch(`/inventory/${id}/adjust`, { quantity }),
  getLowStock: (params?: Record<string, unknown>) => api.get("/inventory/low-stock", { params }),
  getValuation: (params?: Record<string, unknown>) => api.get("/inventory/valuation", { params }),
  validateImport: (formData: FormData) => api.post("/inventory/import/validate", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  commitImport: (data: Record<string, unknown>) => api.post("/inventory/import/commit", data),
  export: (params?: Record<string, unknown>) => api.get("/inventory/export", { params, responseType: "blob" }),
};

export const salesApi = {
  create: (data: Record<string, unknown>) => api.post("/sales", data),
  list: (params?: Record<string, unknown>) => api.get("/sales", { params }),
  get: (id: string) => api.get(`/sales/${id}`),
  return: (id: string, data: Record<string, unknown>) => api.post(`/sales/${id}/return`, data),
  getReceipt: (id: string) => api.get(`/sales/${id}/receipt`),
  getInvoicePDF: (id: string) => api.get(`/sales/${id}/invoice/pdf`, { responseType: "blob" }),
};

export const reportApi = {
  salesSummary: (params?: Record<string, unknown>) => api.get("/reports/sales-summary", { params }),
  topProducts: (params?: Record<string, unknown>) => api.get("/reports/top-products", { params }),
  cashierPerformance: (params?: Record<string, unknown>) => api.get("/reports/cashier-performance", { params }),
  categoryShare: (params?: Record<string, unknown>) => api.get("/reports/category-share", { params }),
  inventoryLevels: (params?: Record<string, unknown>) => api.get("/reports/inventory-levels", { params }),
  storesComparison: (params?: Record<string, unknown>) => api.get("/reports/stores-comparison", { params }),
  topCustomers: (params?: Record<string, unknown>) => api.get("/reports/top-customers", { params }),
  salesByHour: (params?: Record<string, unknown>) => api.get("/reports/sales-by-hour", { params }),
  export: (params?: Record<string, unknown>) => api.get("/reports/export", { params, responseType: "blob" }),
};

export const customerApi = {
  list: (params?: Record<string, unknown>) => api.get("/customers", { params }),
  create: (data: Record<string, unknown>) => api.post("/customers", data),
  get: (id: string) => api.get(`/customers/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const supplierApi = {
  list: (params?: Record<string, unknown>) => api.get("/suppliers", { params }),
  create: (data: Record<string, unknown>) => api.post("/suppliers", data),
  get: (id: string) => api.get(`/suppliers/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const purchaseOrderApi = {
  list: (params?: Record<string, unknown>) => api.get("/purchase-orders", { params }),
  create: (data: Record<string, unknown>) => api.post("/purchase-orders", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/purchase-orders/${id}`, data),
  receive: (id: string, data?: Record<string, unknown>) => api.patch(`/purchase-orders/${id}/receive`, data),
};

