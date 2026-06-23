package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.category.UpsertCategoryRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.category.CategoryResponse;
import com.agri.ecommerce.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin - Category Management", description = "API quan tri danh muc")
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CategoryManagementController {

    private final CategoryService categoryService;

    @Operation(summary = "Lay danh sach danh muc")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        List<CategoryResponse> response = categoryService.getAllCategories();

        return ResponseEntity.ok(
                ApiResponse.success("Lay danh sach danh muc thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lay chi tiet danh muc")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(
            @PathVariable Long id
    ) {
        CategoryResponse response = categoryService.getCategoryById(id);

        return ResponseEntity.ok(
                ApiResponse.success("Lay chi tiet danh muc thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Them danh muc")
    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody UpsertCategoryRequest request
    ) {
        CategoryResponse response = categoryService.createCategory(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Them danh muc thanh cong", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Cap nhat danh muc")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody UpsertCategoryRequest request
    ) {
        CategoryResponse response = categoryService.updateCategory(id, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat danh muc thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xoa danh muc")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteCategory(
            @PathVariable Long id
    ) {
        categoryService.deleteCategory(id);

        return ResponseEntity.ok(
                ApiResponse.success("Xoa danh muc thanh cong", null, HttpStatus.OK.value())
        );
    }
}
