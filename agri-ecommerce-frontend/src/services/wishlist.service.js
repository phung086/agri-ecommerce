import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

export const wishlistService = {
  getWishlist: async () => {
    const response = await axiosClient.get("/customer/wishlist");
    return unwrapApiData(response);
  },

  addItem: async (payload) => {
    const response = await axiosClient.post("/customer/wishlist/items", payload);
    return unwrapApiData(response);
  },

  removeItem: async (productId) => {
    const response = await axiosClient.delete(
      `/customer/wishlist/items/${productId}`
    );
    return unwrapApiData(response);
  },
};
