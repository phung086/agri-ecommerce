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
    const response = await axiosClient.get("/admin/categories");
    return unwrapApiData(response);
  },

  createCategory: async (payload) => {
    const response = await axiosClient.post("/admin/categories", payload);
    return unwrapApiData(response);
  },

  updateCategory: async (id, payload) => {
    const response = await axiosClient.put(`/admin/categories/${id}`, payload);
    return unwrapApiData(response);
  },

  deleteCategory: async (id) => {
    const response = await axiosClient.delete(`/admin/categories/${id}`);
    return unwrapApiData(response);
  },

  uploadImage: async (file, type) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const response = await axiosClient.post("/admin/uploads/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return unwrapApiData(response);
  },

  getProducts: async (params = {}) => {
    const response = await axiosClient.get("/admin/products", { params });
    return unwrapApiData(response);
  },

  createProduct: async (payload) => {
    const response = await axiosClient.post("/admin/products", payload);
    return unwrapApiData(response);
  },

  updateProduct: async (id, payload) => {
    const response = await axiosClient.put(`/admin/products/${id}`, payload);
    return unwrapApiData(response);
  },

  deleteProduct: async (id) => {
    const response = await axiosClient.delete(`/admin/products/${id}`);
    return unwrapApiData(response);
  },
};
