package com.agri.ecommerce.dto.response.auth;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PasswordResetResponse {

    private String email;

    private String resetToken;

    private Long expiresInMinutes;

    private boolean tokenExposed;

    private String message;
}
