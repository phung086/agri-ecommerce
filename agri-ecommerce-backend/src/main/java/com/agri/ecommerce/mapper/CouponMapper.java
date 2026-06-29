package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.coupon.CouponResponse;
import com.agri.ecommerce.entity.CouponEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class CouponMapper {

    public CouponResponse toCouponResponse(CouponEntity coupon) {
        LocalDateTime now = LocalDateTime.now();
        boolean expired = coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(now);
        boolean notStarted = coupon.getStartsAt() != null && coupon.getStartsAt().isAfter(now);
        boolean usageExhausted = coupon.getUsageLimit() != null
                && coupon.getTimesUsed() != null
                && coupon.getTimesUsed() >= coupon.getUsageLimit();
        boolean available = Boolean.TRUE.equals(coupon.getActive()) && !notStarted && !expired && !usageExhausted;

        return CouponResponse.builder()
                .id(coupon.getId())
                .code(coupon.getCode())
                .couponType(coupon.getCouponType())
                .discountType(coupon.getDiscountType())
                .discountPercentage(coupon.getDiscountPercentage())
                .discountAmount(coupon.getDiscountAmount())
                .startsAt(coupon.getStartsAt())
                .expiresAt(coupon.getExpiresAt())
                .usageLimit(coupon.getUsageLimit())
                .timesUsed(coupon.getTimesUsed())
                .active(coupon.getActive())
                .expired(expired)
                .usageExhausted(usageExhausted)
                .available(available)
                .createdAt(coupon.getCreatedAt())
                .updatedAt(coupon.getUpdatedAt())
                .build();
    }
}
