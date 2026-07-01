package com.agri.ecommerce.dto.request.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên không được vượt quá 255 ký tự")
    private String name;

    @Pattern(
            regexp = "^(?:\\+84|84|0)(3|5|7|8|9|2)\\d{8}$",
            message = "Số điện thoại không hợp lệ"
    )
    @Size(max = 255, message = "Số điện thoại không được vượt quá 255 ký tự")
    @Pattern(
            regexp = "^$|^(0[2-9][0-9]{8}|\\+84[2-9][0-9]{8})$",
            message = "Số điện thoại phải đúng định dạng Việt Nam, ví dụ 0987654321 hoặc +84987654321"
    )
    private String phoneNumber;

    private String address;

    @Size(max = 255, message = "Avatar không được vượt quá 255 ký tự")
    private String avatar;
}
