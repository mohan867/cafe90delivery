let rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
rawBase = rawBase.replace(/\/+$/, '');
if (!rawBase.endsWith('/api/v1')) {
  rawBase = `${rawBase}/api/v1`;
}
const API_BASE_URL = rawBase;

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: 'include', // Ensures HttpOnly cookies are automatically attached
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      // Clear invalid session on 401 Unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    if (!res.ok) {
      const errorMessage = data.error?.message || data.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMessage);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    // Auto-save JWT token if returned in response
    const tokenInRes = data.data?.token || data.token;
    if (tokenInRes) {
      localStorage.setItem('token', tokenInRes);
    }

    return data;
  } catch (err) {
    if (!err.status) {
      throw new Error('Cannot connect to server. Please check backend connection.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: async (credentials) => {
    const data = await request('/auth/login', { method: 'POST', body: credentials });
    if (data.data?.token) localStorage.setItem('token', data.data.token);
    return data;
  },
  register: async (userData) => {
    const data = await request('/auth/register', { method: 'POST', body: userData });
    if (data.data?.token) localStorage.setItem('token', data.data.token);
    return data;
  },
  getMe: () => request('/auth/me'),
  refreshToken: async () => {
    const data = await request('/auth/refresh', { method: 'POST' });
    if (data.data?.token) localStorage.setItem('token', data.data.token);
    return data;
  },
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Food
  getCategories: () => request('/food/categories'),
  getFoodItems: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/food/${query ? `?${query}` : ''}`);
  },
  getSingleFoodItem: (id) => request(`/food/${id}`),

  // Cart
  getCart: () => request('/cart/'),
  addToCart: (foodItemId, quantity = 1) => request('/cart/items', { method: 'POST', body: { food_item_id: foodItemId, quantity } }),
  updateCartItem: (itemId, quantity) => request(`/cart/items/${itemId}`, { method: 'PUT', body: { quantity } }),
  removeCartItem: (itemId) => request(`/cart/items/${itemId}`, { method: 'DELETE' }),

  // Orders
  placeOrder: (checkoutData) => request('/orders/', { method: 'POST', body: checkoutData }),
  getMyOrders: () => request('/orders/my-orders'),
  getOrderDetails: (id) => request(`/orders/${id}`),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  updateOrderStatus: (id, status, notes) => request(`/orders/${id}/status`, { method: 'PUT', body: { status, notes } }),

  // Delivery
  getAvailablePool: () => request('/delivery/available-pool'),
  getAssignedOrders: () => request('/delivery/assigned-orders'),
  claimDeliveryTask: (orderId) => request(`/delivery/orders/${orderId}/claim`, { method: 'POST' }),
  updateDeliveryStatus: (orderId, status) => request(`/delivery/orders/${orderId}/status`, { method: 'PUT', body: { status } }),
  updatePartnerLocation: (coords) => request('/delivery/location', { method: 'PUT', body: coords }),

  // Admin
  getAdminDashboard: () => request('/admin/dashboard'),
  getCustomersList: () => request('/admin/customers'),
  getUserDetails: (userId) => request(`/admin/users/${userId}`),
  getStaffList: () => request('/admin/staff'),
  createStaff: (staffData) => request('/admin/staff', { method: 'POST', body: staffData }),
  assignOrder: (orderId, partnerId) => request(`/admin/orders/${orderId}/assign`, { method: 'PUT', body: { delivery_partner_id: partnerId } }),
  addFoodItem: (foodData) => request('/food/', { method: 'POST', body: foodData }),
  updateFoodItem: (id, foodData) => request(`/food/${id}`, { method: 'PUT', body: foodData }),
  deleteFoodItem: (id) => request(`/food/${id}`, { method: 'DELETE' }),
  uploadMenuImage: (imageData) => request('/admin/menu/upload-image', { method: 'POST', body: { image: imageData } }),

  // Pricing Rules
  getPricingRules: () => request('/admin/pricing-rules'),
  createPricingRule: (ruleData) => request('/admin/pricing-rules', { method: 'POST', body: ruleData }),
  updatePricingRule: (id, ruleData) => request(`/admin/pricing-rules/${id}`, { method: 'PUT', body: ruleData }),

  // Feedback & Reports
  submitContactFeedback: (feedbackData) => request('/admin/contact', { method: 'POST', body: feedbackData }),
  getFeedbacks: () => request('/admin/feedback'),
  getMyFeedbacks: () => request('/admin/feedback/my-requests'),
  updateFeedbackStatus: (id, status, adminReply = '') => request(`/admin/feedback/${id}/status`, { method: 'PUT', body: { status, admin_reply: adminReply } }),

  // Admin / General Orders
  getAllOrders: (status = '') => request(`/orders/all${status ? `?status=${status}` : ''}`),

  // Delivery Partner Status & Stats
  updatePartnerWorkStatus: (status) => request('/delivery/status', { method: 'PUT', body: { status } }),
  getDeliveryStats: () => request('/delivery/my-stats'),
  updatePartnerAvatar: (avatarData) => request('/delivery/profile/avatar', { method: 'PUT', body: { avatar: avatarData } }),


  // Saved User Addresses (Max 5)
  getSavedAddresses: () => request('/auth/addresses'),
  saveAddress: (addressData) => request('/auth/addresses', { method: 'POST', body: addressData }),
  deleteSavedAddress: (id) => request(`/auth/addresses/${id}`, { method: 'DELETE' }),
};
