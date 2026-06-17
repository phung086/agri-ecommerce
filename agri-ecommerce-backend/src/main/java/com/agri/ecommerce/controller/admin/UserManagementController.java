package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.user.UpdateUserStatusRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - User Management", description = "API quản trị người dùng")
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserManagementController {

    private final UserService userService;

    @Operation(summary = "Lấy danh sách người dùng")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> response = userService.getAllUsers();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách người dùng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết người dùng")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
            @PathVariable Long id
    ) {
        UserResponse response = userService.getUserById(id);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết người dùng thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật trạng thái người dùng")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        UserResponse response = userService.updateUserStatus(id, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật trạng thái người dùng thành công", response, HttpStatus.OK.value())
        );
    }
}