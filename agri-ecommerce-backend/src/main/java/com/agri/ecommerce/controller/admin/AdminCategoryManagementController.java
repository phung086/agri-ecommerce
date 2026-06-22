package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.category.CategoryCreateRequest;
import com.agri.ecommerce.dto.request.category.CategoryUpdateRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.category.CategoryResponse;
import com.agri.ecommerce.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - Category Management", description = "API quản trị danh mục sản phẩm")
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryManagementController {

    private final CategoryService categoryService;

    @Operation(summary = "Lấy danh sách danh mục cho admin")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        List<CategoryResponse> response = categoryService.getAllCategories();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách danh mục thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Tạo danh mục mới")
    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CategoryCreateRequest request
    ) {
        CategoryResponse response = categoryService.createCategory(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo danh mục thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Lấy chi tiết danh mục theo id")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(
            @Parameter(description = "ID danh mục", example = "1")
            @PathVariable Long id
    ) {
        CategoryResponse response = categoryService.getCategoryById(id);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết danh mục thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật danh mục")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @Parameter(description = "ID danh mục", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CategoryUpdateRequest request
    ) {
        CategoryResponse response = categoryService.updateCategory(id, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật danh mục thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa danh mục nếu chưa có sản phẩm")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteCategory(
            @Parameter(description = "ID danh mục", example = "1")
            @PathVariable Long id
    ) {
        categoryService.deleteCategory(id);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa danh mục thành công", null, HttpStatus.OK.value())
        );
    }
}
