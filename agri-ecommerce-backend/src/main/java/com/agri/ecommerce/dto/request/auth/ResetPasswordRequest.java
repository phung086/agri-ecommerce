package com.agri.ecommerce.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Email must not be blank")
    @Email(message = "Email format is invalid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @NotBlank(message = "Reset token must not be blank")
    @Size(max = 255, message = "Reset token must not exceed 255 characters")
    private String token;

    @NotBlank(message = "New password must not be blank")
    @Size(min = 6, max = 72, message = "New password must be from 6 to 72 characters")
    private String newPassword;

    @NotBlank(message = "Password confirmation must not be blank")
    @Size(min = 6, max = 72, message = "Password confirmation must be from 6 to 72 characters")
    private String confirmPassword;
}
