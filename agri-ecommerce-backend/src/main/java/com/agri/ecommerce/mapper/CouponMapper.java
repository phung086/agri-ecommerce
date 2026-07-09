package com.agri.ecommerce.mapper;

import com.agri.ecommerce.dto.response.coupon.CouponResponse;
import com.agri.ecommerce.entity.CouponEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class CouponMapper {

    public CouponResponse toCouponResponse(CouponEntity coupon) {
        // Đồng bộ múi giờ UTC+7 cho thời gian hiện tại
        java.time.ZonedDateTime nowZoned = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime now = nowZoned.toLocalDateTime();
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
                .productId(coupon.getProductId())
                .discountPercentage(coupon.getDiscountPercentage())
                .discountAmount(coupon.getDiscountAmount())
                .minOrderValue(coupon.getMinOrderValue())
                .startsAt(coupon.getStartsAt())
                .expiresAt(coupon.getExpiresAt())
                .usageLimit(coupon.getUsageLimit())
                .timesUsed(coupon.getTimesUsed())
                .active(coupon.getActive())
                .expired(expired)
                .usageExhausted(usageExhausted)
                .available(available)
                .requiredMembershipTier(coupon.getRequiredMembershipTier())
                .guestAllowed(coupon.getGuestAllowed() != null ? coupon.getGuestAllowed() : true)
                .createdAt(coupon.getCreatedAt())
                .updatedAt(coupon.getUpdatedAt())
                .build();

    }
}
