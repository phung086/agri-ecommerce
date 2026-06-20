import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

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
    const response = await axiosClient.get("/public/categories");
    return unwrapApiData(response);
  },

  getProducts: async (params = {}) => {
    const response = await axiosClient.get("/public/products", { params });
    return unwrapApiData(response);
  },
};
