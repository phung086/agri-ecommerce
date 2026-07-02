import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

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
};
