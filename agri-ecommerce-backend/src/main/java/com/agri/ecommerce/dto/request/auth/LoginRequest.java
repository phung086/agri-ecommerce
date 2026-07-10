package com.agri.ecommerce.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Email hoặc số điện thoại không được để trống")
    @Size(max = 255, message = "Email hoặc số điện thoại không được vượt quá 255 ký tự")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(max = 72, message = "Mật khẩu không được vượt quá 72 ký tự")
    private String password;
}
