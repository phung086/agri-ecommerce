import axiosClient from "@/lib/axios-client";
import { AUTH_SCOPES, getAuthToken } from "@/lib/auth-storage";

const unwrapApiData = (response) => response?.data ?? response;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function requestWithDeliveryToken(path, options = {}) {
  const token = getAuthToken(AUTH_SCOPES.delivery);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw {
      status: response.status,
      message:
        payload?.errors ||
        payload?.message ||
        "Có lỗi xảy ra, vui lòng thử lại.",
      errors: payload?.errors || null,
    };
  }

  return unwrapApiData(payload);
}

export const deliveryService = {
  getAssignedOrders: async (params = {}) => {
    const response = await axiosClient.get("/delivery/orders", { params });
    return unwrapApiData(response);
  },

  getDeliveryHistory: async (params = {}) => {
    const response = await axiosClient.get("/delivery/orders/history", {
      params,
    });
    return unwrapApiData(response);
  },

  getAssignedOrder: async (orderId) => {
    const response = await axiosClient.get(`/delivery/orders/${orderId}`);
    return unwrapApiData(response);
  },

  markOutForDelivery: async (orderId, payload = {}) => {
    const response = await axiosClient.patch(
      `/delivery/orders/${orderId}/out-for-delivery`,
      payload
    );
    return unwrapApiData(response);
  },

  markDelivered: async (orderId, payload = {}) => {
    const response = await axiosClient.patch(
      `/delivery/orders/${orderId}/delivered`,
      payload
    );
    return unwrapApiData(response);
  },

  markFailedAttempt: async (orderId, payload = {}) => {
    const response = await axiosClient.patch(
      `/delivery/orders/${orderId}/failed-attempt`,
      payload
    );
    return unwrapApiData(response);
  },

  uploadProofImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosClient.post("/delivery/uploads/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return unwrapApiData(response);
  },

  getProfile: async () =>
    requestWithDeliveryToken("/customer/profile", {
      method: "GET",
    }),

  updateProfile: async (payload) =>
    requestWithDeliveryToken("/customer/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestWithDeliveryToken("/customer/profile/avatar", {
      method: "POST",
      body: formData,
    });
  },

  deleteAvatar: async () =>
    requestWithDeliveryToken("/customer/profile/avatar", {
      method: "DELETE",
    }),
};
