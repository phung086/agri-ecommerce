import axiosClient from "@/lib/axios-client";

export const profileService = {
  getProfile: async () => {
    return axiosClient.get("/customer/profile");
  },

  updateProfile: async (payload) => {
    return axiosClient.put("/customer/profile", payload);
  },

  changePassword: async (payload) => {
    return axiosClient.patch("/customer/profile/change-password", payload);
  },
};
