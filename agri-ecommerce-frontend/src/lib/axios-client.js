import axios from "axios";
import { clearAuthSession, getAuthToken } from "@/lib/auth-storage";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession();

      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/admin") &&
        window.location.pathname !== "/admin/login"
      ) {
        const next = encodeURIComponent(window.location.pathname);
        window.location.assign(`/admin/login?next=${next}`);
      }
    }

    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Có lỗi xảy ra, vui lòng thử lại.";

    return Promise.reject({
      status: error?.response?.status,
      message,
      errors: error?.response?.data?.errors || null,
    });
  }
);

export default axiosClient;
