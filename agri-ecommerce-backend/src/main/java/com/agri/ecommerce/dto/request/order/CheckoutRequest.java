package com.agri.ecommerce.dto.request.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CheckoutRequest {

    @NotNull(message = "Địa chỉ giao hàng không được để trống")
    private Long shippingAddressId;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    @Size(max = 255, message = "Phương thức thanh toán không được vượt quá 255 ký tự")
    private String paymentMethod;

    @Size(max = 255, message = "Mã giảm giá không được vượt quá 255 ký tự")
    private String couponCode;
}
