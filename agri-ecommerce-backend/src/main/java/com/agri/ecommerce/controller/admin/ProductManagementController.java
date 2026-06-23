package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.product.UpsertProductRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@Tag(name = "Admin - Product Management", description = "API quan tri san pham")
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ProductManagementController {

    private final ProductService productService;

    @Operation(summary = "Lay danh sach san pham admin")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categorySlug,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<ProductResponse> response = productService.getProducts(
                keyword,
                categorySlug,
                minPrice,
                maxPrice,
                status,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lay danh sach san pham thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lay chi tiet san pham")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(
            @PathVariable Long id
    ) {
        ProductResponse response = productService.getProductById(id);

        return ResponseEntity.ok(
                ApiResponse.success("Lay chi tiet san pham thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Them san pham")
    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody UpsertProductRequest request
    ) {
        ProductResponse response = productService.createProduct(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Them san pham thanh cong", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Cap nhat san pham")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody UpsertProductRequest request
    ) {
        ProductResponse response = productService.updateProduct(id, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat san pham thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xoa san pham")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteProduct(
            @PathVariable Long id
    ) {
        productService.deleteProduct(id);

        return ResponseEntity.ok(
                ApiResponse.success("Xoa san pham thanh cong", null, HttpStatus.OK.value())
        );
    }
}
