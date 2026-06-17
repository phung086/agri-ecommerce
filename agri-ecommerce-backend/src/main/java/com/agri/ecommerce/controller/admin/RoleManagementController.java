package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.role.RoleResponse;
import com.agri.ecommerce.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - Role Management", description = "API quản trị vai trò người dùng")
@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RoleManagementController {

    private final RoleService roleService;

    @Operation(summary = "Lấy danh sách vai trò")
    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        List<RoleResponse> response = roleService.getAllRoles();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách vai trò thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết vai trò")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(
            @PathVariable Long id
    ) {
        RoleResponse response = roleService.getRoleById(id);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết vai trò thành công", response, HttpStatus.OK.value())
        );
    }
}