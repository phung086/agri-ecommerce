package com.agri.ecommerce.controller.auth;

import com.agri.ecommerce.dto.request.auth.ForgotPasswordRequest;
import com.agri.ecommerce.dto.request.auth.LoginRequest;
import com.agri.ecommerce.dto.request.auth.RegisterRequest;
import com.agri.ecommerce.dto.request.auth.ResetPasswordRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.auth.AuthResponse;
import com.agri.ecommerce.dto.response.auth.PasswordResetResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Auth", description = "Register, login, password reset, and current user APIs")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register a customer account")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        AuthResponse response = authService.register(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account registered successfully", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Login")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request);

        return ResponseEntity.ok(
                ApiResponse.success("Login successful", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Request a password reset token")
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<PasswordResetResponse>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        PasswordResetResponse response = authService.forgotPassword(request);

        return ResponseEntity.ok(
                ApiResponse.success("Password reset request handled successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Reset password using a reset token")
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<PasswordResetResponse>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        PasswordResetResponse response = authService.resetPassword(request);

        return ResponseEntity.ok(
                ApiResponse.success("Password reset successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get current user")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserResponse response = authService.getCurrentUser(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Current user loaded successfully", response, HttpStatus.OK.value())
        );
    }
}
