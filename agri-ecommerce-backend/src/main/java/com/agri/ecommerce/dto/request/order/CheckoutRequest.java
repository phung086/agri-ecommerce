package com.agri.ecommerce.dto.request.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CheckoutRequest {

    private Long shippingAddressId;

    @NotBlank(message = "Payment method is required")
    @Size(max = 255, message = "Payment method must not exceed 255 characters")
    private String paymentMethod;

    @Size(max = 255, message = "Coupon code must not exceed 255 characters")
    private String couponCode;

    private Boolean usePoints;

    @Valid
    private List<CheckoutItemRequest> items;

    @Size(max = 255, message = "Guest name must not exceed 255 characters")
    private String guestFullName;

    /**
     * SĐT khách: bỏ trống OK, hoặc phải đúng đầu số Việt Nam 10 chữ số.
     * Hỗ trợ: 0[2-9]xxxxxxxx, +84[2-9]xxxxxxxx, 84[2-9]xxxxxxxx
     */
    @Pattern(
            regexp = "^$|^(?:\\+84|84|0)(?:2[0-9]|3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
            message = "Số điện thoại khách phải đúng đầu số Việt Nam hợp lệ, ví dụ 0987654321"
    )
    private String guestPhone;

    @Email(message = "Email khách không đúng định dạng")
    @Pattern(
            regexp = "^$|^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$",
            message = "Email khách phải đúng định dạng, ví dụ customer@example.com"
    )
    @Size(max = 255, message = "Guest email must not exceed 255 characters")
    private String guestEmail;

    @Size(max = 500, message = "Guest address must not exceed 500 characters")
    private String guestAddress;

    @Size(max = 255, message = "Guest city must not exceed 255 characters")
    private String guestCity;
}
