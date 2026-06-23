package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.auth.ForgotPasswordRequest;
import com.agri.ecommerce.dto.request.auth.LoginRequest;
import com.agri.ecommerce.dto.request.auth.RegisterRequest;
import com.agri.ecommerce.dto.request.auth.ResetPasswordRequest;
import com.agri.ecommerce.dto.response.auth.AuthResponse;
import com.agri.ecommerce.dto.response.auth.PasswordResetResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    PasswordResetResponse forgotPassword(ForgotPasswordRequest request);

    PasswordResetResponse resetPassword(ResetPasswordRequest request);

    UserResponse getCurrentUser(Long userId);
}
