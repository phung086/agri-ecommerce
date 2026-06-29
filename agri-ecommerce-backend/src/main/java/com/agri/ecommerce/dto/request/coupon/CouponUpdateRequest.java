package com.agri.ecommerce.dto.request.coupon;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class CouponUpdateRequest {

    @NotBlank(message = "Ma giam gia khong duoc de trong")
    @Size(max = 255, message = "Ma giam gia khong duoc vuot qua 255 ky tu")
    private String code;

    private String couponType;

    private String discountType;

    @Min(value = 1, message = "Phan tram giam gia phai tu 1 den 100")
    @Max(value = 100, message = "Phan tram giam gia phai tu 1 den 100")
    private Integer discountPercentage;

    @DecimalMin(value = "0.01", message = "So tien giam gia phai lon hon 0")
    private BigDecimal discountAmount;

    private LocalDateTime startsAt;

    private LocalDateTime expiresAt;

    @Min(value = 1, message = "Gioi han su dung phai lon hon hoac bang 1")
    private Integer usageLimit;

    private Boolean active;
}
