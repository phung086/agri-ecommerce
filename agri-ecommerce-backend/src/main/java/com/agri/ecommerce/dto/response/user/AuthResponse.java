package com.agri.ecommerce.dto.response.auth;

import com.agri.ecommerce.dto.response.user.UserResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class AuthResponse {

    private String accessToken;

    private String tokenType;

    private Long expiresIn;

    private UserResponse user;
}