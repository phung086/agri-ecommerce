package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.auth.LoginRequest;
import com.agri.ecommerce.dto.request.auth.RegisterRequest;
import com.agri.ecommerce.dto.response.auth.AuthResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    UserResponse getCurrentUser(Long userId);
}