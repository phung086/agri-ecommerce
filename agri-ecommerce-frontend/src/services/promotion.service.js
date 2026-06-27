import axiosClient from "@/lib/axios-client";

// axiosClient interceptor already unwraps axios response → returns ApiResponse object.
// unwrapApiData extracts the `data` field from ApiResponse.
const unwrapApiData = (response) => response?.data ?? response;

export const promotionService = {
  /**
   * Fetch active, non-expired, non-exhausted coupons from the public API.
   * GET /api/public/coupons
   * Returns: PageResponse<CouponResponse>
   */
  getPublicCoupons: async ({ page = 0, size = 50, sort = "createdAt,desc" } = {}) => {
    const response = await axiosClient.get("/public/coupons", {
      params: { page, size, sort },
    });
    return unwrapApiData(response); // PageResponse<CouponResponse>
  },

  /**
   * Validate a coupon code string.
   * GET /api/public/coupons/validate?code=XXX
   * Returns: ApiResponse<CouponResponse> — check response.success for validity.
   * Throws on 404 (code not found).
   */
  validateCouponCode: async (code) => {
    // axiosClient already throws on error status, so we get the full ApiResponse here
    const apiResponse = await axiosClient.get("/public/coupons/validate", {
      params: { code: code.trim().toUpperCase() },
    });
    // apiResponse is already the ApiResponse object (axios interceptor returns response.data)
    return apiResponse; // { success, message, data: CouponResponse | null }
  },

  /**
   * Fetch a single coupon by ID.
   * GET /api/public/coupons/{id}
   */
  getPublicCoupon: async (id) => {
    const response = await axiosClient.get(`/public/coupons/${id}`);
    return unwrapApiData(response); // CouponResponse
  },
};
