package com.agri.ecommerce.dto.response.coupon;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CouponResponse {

    private Long id;

    private String code;

    private Integer discountPercentage;

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
