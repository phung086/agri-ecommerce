import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

export const reviewService = {
  getProductReviews: async (productSlug, params = {}) => {
    const response = await axiosClient.get(
      `/public/products/${encodeURIComponent(productSlug)}/reviews`,
      { params }
    );
    return unwrapApiData(response);
  },

  getMyReviews: async (params = {}) => {
    const response = await axiosClient.get("/customer/reviews", { params });
    return unwrapApiData(response);
  },

  createReview: async (payload) => {
    const response = await axiosClient.post("/customer/reviews", payload);
    return unwrapApiData(response);
  },

  updateReview: async (reviewId, payload) => {
    const response = await axiosClient.put(
      `/customer/reviews/${reviewId}`,
      payload
    );
    return unwrapApiData(response);
  },

  deleteReview: async (reviewId) => {
    const response = await axiosClient.delete(`/customer/reviews/${reviewId}`);
    return unwrapApiData(response);
  },
};
