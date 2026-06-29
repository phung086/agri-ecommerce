package com.agri.ecommerce.dto.request.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShippingAddressRequest {

    @NotBlank(message = "Họ tên người nhận không được để trống")
    @Size(max = 255, message = "Họ tên người nhận không được vượt quá 255 ký tự")
    private String fullName;

    @NotBlank(message = "Số điện thoại không hợp lệ.")
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại không hợp lệ.")
    private String phone;

    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
    private String address;

    @NotBlank(message = "Thành phố/Tỉnh không được để trống")
    @Size(max = 255, message = "Thành phố/Tỉnh không được vượt quá 100 ký tự")
    private String city;

    private Boolean defaultAddress;
}
