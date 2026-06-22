package com.agri.ecommerce.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordRequest {

    @NotBlank(message = "Email must not be blank")
    @Email(message = "Email format is invalid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;
}
