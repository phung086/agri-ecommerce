import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => {
  // axios interceptor đã unwrap HTTP response.data → response là ApiResponse object
  // { success, message, data, errors, statusCode, timestamp }
  if (response && typeof response === "object" && "success" in response) {
    return response.data ?? null;
  }
  return response;
};

export const adminService = {
  getUsers: async () => {
    const response = await axiosClient.get("/admin/users");
    return unwrapApiData(response);
  },

  updateUserStatus: async (id, status) => {
    const response = await axiosClient.patch(`/admin/users/${id}/status`, {
      status,
    });
    return unwrapApiData(response);
  },

  getRoles: async () => {
    const response = await axiosClient.get("/admin/roles");
    return unwrapApiData(response);
  },

  getCategories: async () => {
    const response = await axiosClient.get("/admin/categories");
    return unwrapApiData(response);
  },

  createCategory: async (payload) => {
    const response = await axiosClient.post("/admin/categories", payload);
    return unwrapApiData(response);
  },

  updateCategory: async (categoryId, payload) => {
    const response = await axiosClient.put(
      `/admin/categories/${categoryId}`,
      payload
    );
    return unwrapApiData(response);
  },

  deleteCategory: async (categoryId) => {
    const response = await axiosClient.delete(`/admin/categories/${categoryId}`);
    return unwrapApiData(response);
  },

  uploadImage: async (file, type) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const response = await axiosClient.post("/admin/uploads/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return unwrapApiData(response);
  },

  getProducts: async (params = {}) => {
    const response = await axiosClient.get("/admin/products", { params });
    return unwrapApiData(response);
  },

  createProduct: async (payload) => {
    const response = await axiosClient.post("/admin/products", payload);
    return unwrapApiData(response);
  },

  updateProduct: async (productId, payload) => {
    const response = await axiosClient.put(
      `/admin/products/${productId}`,
      payload
    );
    return unwrapApiData(response);
  },

  updateProductStatus: async (productId, payload) => {
    const response = await axiosClient.patch(
      `/admin/products/${productId}/status`,
      payload
    );
    return unwrapApiData(response);
  },

  updateProductStock: async (productId, payload) => {
    const response = await axiosClient.patch(
      `/admin/products/${productId}/stock`,
      payload
    );
    return unwrapApiData(response);
  },

  deleteProduct: async (productId) => {
    const response = await axiosClient.delete(`/admin/products/${productId}`);
    return unwrapApiData(response);
  },

  getOrders: async (params = {}) => {
    const response = await axiosClient.get("/admin/orders", { params });
    return unwrapApiData(response);
  },

  getOrder: async (orderId) => {
    const response = await axiosClient.get(`/admin/orders/${orderId}`);
    return unwrapApiData(response);
  },

  confirmOrder: async (orderId, payload = {}) => {
    const response = await axiosClient.patch(
      `/admin/orders/${orderId}/confirm`,
      payload
    );
    return unwrapApiData(response);
  },

  cancelOrder: async (orderId, payload = {}) => {
    const response = await axiosClient.patch(
      `/admin/orders/${orderId}/cancel`,
      payload
    );
    return unwrapApiData(response);
  },

  updateOrderStatus: async (orderId, payload) => {
    const response = await axiosClient.patch(
      `/admin/orders/${orderId}/status`,
      payload
    );
    return unwrapApiData(response);
  },

  getActiveDeliveryStaff: async () => {
    const response = await axiosClient.get("/admin/orders/delivery-staff");
    return unwrapApiData(response);
  },

  assignDeliveryStaff: async (orderId, payload) => {
    const response = await axiosClient.patch(
      `/admin/orders/${orderId}/delivery-staff`,
      payload
    );
    return unwrapApiData(response);
  },

  getCoupons: async (params = {}) => {
    const response = await axiosClient.get("/admin/coupons", { params });
    return unwrapApiData(response);
  },

  createCoupon: async (payload) => {
    const response = await axiosClient.post("/admin/coupons", payload);
    return unwrapApiData(response);
  },

  updateCoupon: async (couponId, payload) => {
    const response = await axiosClient.put(
      `/admin/coupons/${couponId}`,
      payload
    );
    return unwrapApiData(response);
  },

  updateCouponStatus: async (couponId, payload) => {
    const response = await axiosClient.patch(
      `/admin/coupons/${couponId}/status`,
      payload
    );
    return unwrapApiData(response);
  },

  deleteCoupon: async (couponId) => {
    const response = await axiosClient.delete(`/admin/coupons/${couponId}`);
    return unwrapApiData(response);
  },

  getContacts: async (params = {}) => {
    const response = await axiosClient.get("/admin/contacts", { params });
    return unwrapApiData(response);
  },

  getContact: async (contactId) => {
    const response = await axiosClient.get(`/admin/contacts/${contactId}`);
    return unwrapApiData(response);
  },

  updateContactReplied: async (contactId, payload) => {
    const response = await axiosClient.patch(
      `/admin/contacts/${contactId}/replied`,
      payload
    );
    return unwrapApiData(response);
  },

  deleteContact: async (contactId) => {
    const response = await axiosClient.delete(`/admin/contacts/${contactId}`);
    return unwrapApiData(response);
  },
};
