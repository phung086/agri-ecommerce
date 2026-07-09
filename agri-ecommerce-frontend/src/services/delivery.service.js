import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

const fetchAssignedOrders = async (params = {}) => {
  const response = await axiosClient.get("/delivery/orders", { params });
  return unwrapApiData(response);
};

const fetchAssignedOrder = async (orderId) => {
  const response = await axiosClient.get(`/delivery/orders/${orderId}`);
  return unwrapApiData(response);
};

export const deliveryService = {
  getAssignedOrders: fetchAssignedOrders,
  getDeliveryOrders: fetchAssignedOrders,

  getDeliveryHistory: async (params = {}) => {
    const response = await axiosClient.get("/delivery/orders/history", {
      params,
    });
    return unwrapApiData(response);
  },

  getAssignedOrder: fetchAssignedOrder,
  getOrderDetail: fetchAssignedOrder,

  markOutForDelivery: async (orderId, payload = {}) => {
    const response = await axiosClient.patch(
      `/delivery/orders/${orderId}/out-for-delivery`,
      payload
    );
    return unwrapApiData(response);
  },
  startDelivery: async (orderId, payload = {}) => {
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

  updateDeliveryStatus: async (orderId, payload = {}) => {
    const response = await axiosClient.patch(
      `/delivery/orders/${orderId}/status`,
      payload
    );
    return unwrapApiData(response);
  },
  getOrderTrackingHistory: async (orderId) => {
    const order = await fetchAssignedOrder(orderId);
    return order?.statusHistory || [];
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

  notifyArrival: async (orderId) => {
    const response = await axiosClient.post(`/delivery/orders/${orderId}/notify-arrival`);
    return unwrapApiData(response);
  },
};
