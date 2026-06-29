import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

export const orderService = {
  getOrders: async (params = {}) => {
    const response = await axiosClient.get("/customer/orders", { params });
    return unwrapApiData(response);
  },

  getOrder: async (orderId) => {
    const response = await axiosClient.get(`/customer/orders/${orderId}`);
    return unwrapApiData(response);
  },

  previewCheckout: async (payload) => {
    const response = await axiosClient.post(
      "/customer/orders/checkout/preview",
      payload
    );
    return unwrapApiData(response);
  },

  checkout: async (payload) => {
    const response = await axiosClient.post(
      "/customer/orders/checkout",
      payload
    );
    return unwrapApiData(response);
  },

  createVnpayPaymentUrl: async (orderId, payload = {}) => {
    const response = await axiosClient.post(
      `/customer/orders/${orderId}/payment/vnpay`,
      payload
    );
    return unwrapApiData(response);
  },

  verifyVnpayReturn: async (params = {}) => {
    const response = await axiosClient.get("/public/payments/vnpay/return", {
      params,
    });
    return unwrapApiData(response);
  },
};
