package com.agri.ecommerce.dto.request.coupon;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CouponStatusUpdateRequest {

    @NotNull(message = "Trạng thái mã giảm giá không được để trống")
    private Boolean active;
}
