import axiosClient from "@/lib/axios-client";

export const authService = {
  register: async (payload) => {
    return axiosClient.post("/auth/register", payload);
  },

  login: async (payload) => {
    return axiosClient.post("/auth/login", payload);
  },

  me: async () => {
    return axiosClient.get("/auth/me");
  },

  forgotPassword: async (payload) => {
    return axiosClient.post("/auth/forgot-password", payload);
  },

  resetPassword: async (payload) => {
    return axiosClient.post("/auth/reset-password", payload);
  },
};
