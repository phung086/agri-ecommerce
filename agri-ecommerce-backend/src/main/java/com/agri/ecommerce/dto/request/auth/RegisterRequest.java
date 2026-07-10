package com.agri.ecommerce.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên không được vượt quá 255 ký tự")
    private String name;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
            message = "Email phải đúng định dạng, ví dụ customer@example.com"
    )
    @Size(max = 255, message = "Email không được vượt quá 255 ký tự")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 72, message = "Mật khẩu phải từ 6 đến 72 ký tự")
    private String password;

    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
    @Pattern(
            regexp = "^$|^(?:\\+84|84|0)(?:2[0-9]|3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
            message = "Số điện thoại phải đúng đầu số Việt Nam hợp lệ, ví dụ 0987654321 hoặc +84987654321"
    )
    private String phoneNumber;

    private String address;
}
