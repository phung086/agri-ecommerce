package com.agri.ecommerce.dto.request.user;

import jakarta.validation.constraints.Email;
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

    @Email(message = "Email không hợp lệ")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
            message = "Email phải đúng định dạng, ví dụ customer@example.com"
    )
    @Size(max = 255, message = "Email không được vượt quá 255 ký tự")
    private String email;

    @Size(max = 255, message = "Số điện thoại không được vượt quá 255 ký tự")
    @Pattern(
            regexp = "^$|^(0[2-9][0-9]{8}|84[2-9][0-9]{8}|\\+84[2-9][0-9]{8})$",
            message = "Số điện thoại phải đúng định dạng Việt Nam, ví dụ 0987654321 hoặc +84987654321"
    )
    private String phoneNumber;

    @Size(max = 1000, message = "Địa chỉ không được vượt quá 1000 ký tự")
    private String address;

    @Size(max = 255, message = "Avatar không được vượt quá 255 ký tự")
    private String avatar;
}
