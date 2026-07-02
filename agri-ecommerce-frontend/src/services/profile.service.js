import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

export const profileService = {
  getProfile: async () => {
    const response = await axiosClient.get("/customer/profile");
    return unwrapApiData(response);
  },

  updateProfile: async (payload) => {
    const response = await axiosClient.put("/customer/profile", payload);
    return unwrapApiData(response);
  },

  changePassword: async (payload) => {
    const response = await axiosClient.patch(
      "/customer/profile/change-password",
      payload
    );
    return unwrapApiData(response);
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post("/customer/profile/avatar", formData);

    return unwrapApiData(response);
  },

  deleteAvatar: async () => {
    const response = await axiosClient.delete("/customer/profile/avatar");
    return unwrapApiData(response);
  },
};

