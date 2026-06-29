package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.coupon.CouponCreateRequest;
import com.agri.ecommerce.dto.request.coupon.CouponStatusUpdateRequest;
import com.agri.ecommerce.dto.request.coupon.CouponUpdateRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.coupon.CouponResponse;

public interface CouponService {

    PageResponse<CouponResponse> getCoupons(
            String keyword,
            Boolean active,
            Boolean expired,
            Boolean exhausted,
            int page,
            int size,
            String sort
    );

    CouponResponse getCoupon(Long couponId);

    CouponResponse createCoupon(CouponCreateRequest request);

    CouponResponse updateCoupon(Long couponId, CouponUpdateRequest request);

    CouponResponse updateCouponStatus(Long couponId, CouponStatusUpdateRequest request);

    void deleteCoupon(Long couponId);
}
