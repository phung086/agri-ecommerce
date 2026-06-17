package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.request.user.UpdateProfileRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Customer Profile", description = "API quản lý hồ sơ cá nhân của người dùng đăng nhập")
@RestController
@RequestMapping("/api/customer/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;

    @Operation(summary = "Lấy hồ sơ cá nhân")
    @GetMapping
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserResponse response = userService.getCurrentProfile(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Lấy hồ sơ cá nhân thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật hồ sơ cá nhân")
    @PutMapping
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserResponse response = userService.updateCurrentProfile(principal.getId(), request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật hồ sơ cá nhân thành công", response, HttpStatus.OK.value())
        );
    }
}