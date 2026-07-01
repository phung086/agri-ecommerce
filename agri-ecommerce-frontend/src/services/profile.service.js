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

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");
    
    const response = await axiosClient.post("/customer/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response?.data ?? response;
  },
};

