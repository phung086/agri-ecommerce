import axios from "axios";
import { AUTH_SCOPES, clearAuthSession, getAuthToken } from "@/lib/auth-storage";

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
      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const isAdminRoute = pathname.startsWith("/admin");
      const isDeliveryRoute = pathname.startsWith("/delivery");
      const scope = isAdminRoute
        ? AUTH_SCOPES.admin
        : isDeliveryRoute
          ? AUTH_SCOPES.delivery
          : AUTH_SCOPES.customer;

      clearAuthSession(scope);

      if (
        typeof window !== "undefined" &&
        isAdminRoute &&
        pathname !== "/admin/login"
      ) {
        const next = encodeURIComponent(pathname);
        window.location.assign(`/admin/login?next=${next}`);
      }

      if (
        typeof window !== "undefined" &&
        isDeliveryRoute &&
        pathname !== "/delivery"
      ) {
        window.location.assign("/delivery");
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
