package com.agri.ecommerce.dto.request.coupon;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CouponCreateRequest {

    @NotBlank(message = "Mã giảm giá không được để trống")
    @Size(max = 255, message = "Mã giảm giá không được vượt quá 255 ký tự")
    private String code;

    @NotNull(message = "Phần trăm giảm giá không được để trống")
    @Min(value = 1, message = "Phần trăm giảm giá phải từ 1 đến 100")
    @Max(value = 100, message = "Phần trăm giảm giá phải từ 1 đến 100")
    private Integer discountPercentage;

    private LocalDateTime expiresAt;

    @Min(value = 1, message = "Giới hạn sử dụng phải lớn hơn hoặc bằng 1")
    private Integer usageLimit;

    private Boolean active;
}
