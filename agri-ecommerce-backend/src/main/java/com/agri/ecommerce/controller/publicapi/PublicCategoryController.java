package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.category.CategoryResponse;
import com.agri.ecommerce.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Public - Categories", description = "API công khai cho danh mục sản phẩm")
@RestController
@RequestMapping("/api/public/categories")
@RequiredArgsConstructor
public class PublicCategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Lấy danh sách danh mục")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        List<CategoryResponse> response = categoryService.getAllCategories();

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách danh mục thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết danh mục theo slug")
    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryBySlug(
            @Parameter(description = "Slug danh mục", example = "rau-cu")
            @PathVariable String slug
    ) {
        CategoryResponse response = categoryService.getCategoryBySlug(slug);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết danh mục thành công", response, HttpStatus.OK.value())
        );
    }
}
