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

    @NotBlank(message = "Số điện thoại không được để trống")
    @Size(max = 255, message = "Số điện thoại không được vượt quá 255 ký tự")
    @Pattern(
            regexp = "^(0[2-9][0-9]{8}|\\+84[2-9][0-9]{8})$",
            message = "Số điện thoại phải đúng định dạng Việt Nam, ví dụ 0987654321 hoặc +84987654321"
    )
    private String phone;

    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
    private String address;

    @NotBlank(message = "Thành phố không được để trống")
    @Size(max = 255, message = "Thành phố không được vượt quá 255 ký tự")
    private String city;

    private Boolean defaultAddress;
}
