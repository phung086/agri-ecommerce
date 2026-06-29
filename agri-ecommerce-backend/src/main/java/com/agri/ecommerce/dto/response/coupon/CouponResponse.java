package com.agri.ecommerce.dto.response.coupon;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CouponResponse {

    private Long id;

    private String code;

    private String couponType;

    private String discountType;

    private Integer discountPercentage;

    private BigDecimal discountAmount;

    private LocalDateTime startsAt;

    private LocalDateTime expiresAt;

    private Integer usageLimit;

    private Integer timesUsed;

    private Boolean active;

    private Boolean expired;

    private Boolean usageExhausted;

    private Boolean available;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
