package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.permission.PermissionResponse;
import com.agri.ecommerce.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - Permission Management", description = "API quản trị quyền hệ thống")
@RestController
@RequestMapping("/api/admin/permissions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PermissionManagementController {

    private final PermissionService permissionService;

    @Operation(summary = "Lấy danh sách quyền")
    @GetMapping
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        List<PermissionResponse> response = permissionService.getAllPermissions();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách quyền thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết quyền")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PermissionResponse>> getPermissionById(
            @PathVariable Long id
    ) {
        PermissionResponse response = permissionService.getPermissionById(id);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết quyền thành công", response, HttpStatus.OK.value())
        );
    }
}