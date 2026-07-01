import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

export const marketplaceService = {
  getCategories: async () => {
    const response = await axiosClient.get("/public/categories");
    return unwrapApiData(response);
  },

  getProducts: async (params = {}) => {
    const response = await axiosClient.get("/public/products", { params });
    return unwrapApiData(response);
  },

  getProductBySlug: async (slug) => {
    const response = await axiosClient.get(
      `/public/products/${encodeURIComponent(slug)}`
    );
    return unwrapApiData(response);
  },

  createContact: async (payload) => {
    const response = await axiosClient.post("/public/contacts", payload);
    return unwrapApiData(response);
  },
};
