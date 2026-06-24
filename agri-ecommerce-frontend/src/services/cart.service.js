import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

export const cartService = {
  getCart: async () => {
    const response = await axiosClient.get("/customer/cart");
    return unwrapApiData(response);
  },

  addItem: async (payload) => {
    const response = await axiosClient.post("/customer/cart/items", payload);
    return unwrapApiData(response);
  },

  updateItem: async (itemId, payload) => {
    const response = await axiosClient.put(
      `/customer/cart/items/${itemId}`,
      payload
    );
    return unwrapApiData(response);
  },

  removeItem: async (itemId) => {
    const response = await axiosClient.delete(`/customer/cart/items/${itemId}`);
    return unwrapApiData(response);
  },

  clearCart: async () => {
    const response = await axiosClient.delete("/customer/cart");
    return unwrapApiData(response);
  },
};
