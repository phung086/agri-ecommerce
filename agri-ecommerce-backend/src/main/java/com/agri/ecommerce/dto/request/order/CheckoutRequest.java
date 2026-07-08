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

    @Pattern(regexp = "^$|^0\\d{9}$", message = "Guest phone must have 10 digits and start with 0")
    private String guestPhone;

    @Email(message = "Guest email is invalid")
    @Size(max = 255, message = "Guest email must not exceed 255 characters")
    private String guestEmail;

    @Size(max = 500, message = "Guest address must not exceed 500 characters")
    private String guestAddress;

    @Size(max = 255, message = "Guest city must not exceed 255 characters")
    private String guestCity;
}
