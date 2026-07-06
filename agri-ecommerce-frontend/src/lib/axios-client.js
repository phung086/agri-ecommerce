import axios from "axios";
import { AUTH_SCOPES, clearAuthSession, getAuthToken, getCurrentAuthScope } from "@/lib/auth-storage";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof config.headers?.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  if (typeof window !== "undefined") {
    // Determine scope based on the API request URL
    const url = config.url || "";
    const currentScope = getCurrentAuthScope();
    let scope = currentScope; // fallback to current page scope

    if (url.includes("/api/admin/") || url.includes("/admin/")) {
      scope = AUTH_SCOPES.admin;
    } else if (url.includes("/api/delivery/") || url.includes("/delivery/")) {
      scope = AUTH_SCOPES.delivery;
    } else if (url.includes("/api/customer/") || url.includes("/customer/")) {
      if (currentScope !== AUTH_SCOPES.admin && currentScope !== AUTH_SCOPES.delivery) {
        scope = AUTH_SCOPES.customer;
      }
    }

    const token = getAuthToken(scope);

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
      const requestUrl = error.config?.url || "";
      const currentScope = getCurrentAuthScope();
      let scope = currentScope;

      if (requestUrl.includes("/api/admin/") || requestUrl.includes("/admin/")) {
        scope = AUTH_SCOPES.admin;
      } else if (requestUrl.includes("/api/delivery/") || requestUrl.includes("/delivery/")) {
        scope = AUTH_SCOPES.delivery;
      } else if (requestUrl.includes("/api/customer/") || requestUrl.includes("/customer/")) {
        if (currentScope !== AUTH_SCOPES.admin && currentScope !== AUTH_SCOPES.delivery) {
          scope = AUTH_SCOPES.customer;
        }
      } else {
        // Fallback to page pathname if url is not specific
        const pathname = typeof window !== "undefined" ? window.location.pathname : "";
        if (pathname.startsWith("/admin")) {
          scope = AUTH_SCOPES.admin;
        } else if (pathname.startsWith("/delivery")) {
          scope = AUTH_SCOPES.delivery;
        }
      }

      clearAuthSession(scope);

      if (typeof window !== "undefined") {
        const pathname = window.location.pathname;
        if (scope === AUTH_SCOPES.admin && pathname !== "/admin/login") {
          const next = encodeURIComponent(pathname);
          window.location.assign(`/admin/login?next=${next}`);
        } else if (scope === AUTH_SCOPES.delivery && pathname !== "/delivery") {
          window.location.assign("/delivery");
        }
      }
    }

    const apiError = error?.response?.data;
    const errorDetail =
      typeof apiError?.errors === "string" ? apiError.errors : null;
    const message =
      errorDetail ||
      apiError?.message ||
      error?.message ||
      "Có lỗi xảy ra, vui lòng thử lại.";

    return Promise.reject({
      status: error?.response?.status,
      message,
      errors: apiError?.errors || null,
    });
  }
);

export default axiosClient;
