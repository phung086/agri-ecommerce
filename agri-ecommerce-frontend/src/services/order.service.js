import axiosClient from "@/lib/axios-client";
import { AUTH_SCOPES, saveAuthSession } from "@/lib/auth-storage";

const unwrapApiData = (response) => response?.data ?? response;

export function persistGuestAutoLogin(order, fallbackPayload = {}) {
  if (typeof window === "undefined" || !order?.guestAutoLoginToken) {
    return;
  }

  saveAuthSession(
    {
      accessToken: order.guestAutoLoginToken,
      tokenType: "Bearer",
      expiresIn: order.guestAutoLoginExpiresIn,
      user:
        order.guestAutoLoginUser ||
        {
          id: order.customerId,
          name: order.customerName || fallbackPayload.guestFullName || "Khách hàng",
          email: order.guestAutoLoginEmail,
          phoneNumber: order.customerPhoneNumber || fallbackPayload.guestPhone,
          roleName: "customer",
        },
    },
    { remember: true, scope: AUTH_SCOPES.customer }
  );

  window.dispatchEvent(new Event("storage"));
}

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

  previewGuestCheckout: async (payload) => {
    const response = await axiosClient.post(
      "/public/orders/checkout/preview",
      payload
    );
    return unwrapApiData(response);
  },

  guestCheckout: async (payload) => {
    const response = await axiosClient.post(
      "/public/orders/checkout",
      payload
    );
    const order = unwrapApiData(response);

    if (order?.guestAutoLoginToken) {
      persistGuestAutoLogin(order, payload);
      return order;
    }

    if (order?.id && payload?.guestPhone) {
      try {
        const claimResponse = await axiosClient.post(
          "/public/orders/guest-auto-login",
          {
            orderId: order.id,
            phone: payload.guestPhone,
          }
        );
        const claimedOrder = unwrapApiData(claimResponse);
        persistGuestAutoLogin(claimedOrder, payload);
        return claimedOrder || order;
      } catch (error) {
        console.warn("Guest auto-login preparation failed", error);
      }
    }

    return order;
  },

  createVnpayPaymentUrl: async (orderId, payload = {}) => {
    const response = await axiosClient.post(
      `/customer/orders/${orderId}/payment/vnpay`,
      payload
    );
    return unwrapApiData(response);
  },

  createGuestVnpayPaymentUrl: async (orderId, phone, payload = {}) => {
    const response = await axiosClient.post(
      `/public/orders/${orderId}/payment/vnpay`,
      payload,
      { params: { phone } }
    );
    return unwrapApiData(response);
  },

  verifyVnpayReturn: async (params = {}) => {
    const response = await axiosClient.get("/public/payments/vnpay/return", {
      params,
    });
    return unwrapApiData(response);
  },

  trackGuestOrder: async (orderId, phone) => {
    const response = await axiosClient.get("/public/orders/track", {
      params: { orderId, phone },
    });
    return unwrapApiData(response);
  },

  trackByGhnCode: async (trackingCode, phone) => {
    const response = await axiosClient.get("/public/orders/track-by-ghn", {
      params: { trackingCode, phone },
    });
    return unwrapApiData(response);
  },
};
