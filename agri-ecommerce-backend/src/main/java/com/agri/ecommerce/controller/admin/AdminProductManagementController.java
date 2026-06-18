package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.product.ProductCreateRequest;
import com.agri.ecommerce.dto.request.product.ProductStatusUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductStockUpdateRequest;
import com.agri.ecommerce.dto.request.product.ProductUpdateRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Product Management", description = "API quản trị sản phẩm")
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductManagementController {

    private final ProductService productService;

    @Operation(summary = "Lấy danh sách sản phẩm cho admin")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getProducts(
            @Parameter(description = "Từ khóa tìm theo tên hoặc mô tả", example = "rau")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Slug danh mục", example = "rau-cu")
            @RequestParam(required = false) String categorySlug,

            @Parameter(description = "Trạng thái sản phẩm", example = "in_stock")
            @RequestParam(required = false) String status,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "12")
            @RequestParam(defaultValue = "12") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<ProductResponse> response = productService.getAdminProducts(
                keyword,
                categorySlug,
                status,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Tạo sản phẩm mới")
    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody ProductCreateRequest request
    ) {
        ProductResponse response = productService.createProduct(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo sản phẩm thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Lấy chi tiết sản phẩm theo id")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(
            @Parameter(description = "ID sản phẩm", example = "1")
            @PathVariable Long id
    ) {
        ProductResponse response = productService.getProductById(id);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật sản phẩm")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @Parameter(description = "ID sản phẩm", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody ProductUpdateRequest request
    ) {
        ProductResponse response = productService.updateProduct(id, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật trạng thái sản phẩm")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProductStatus(
            @Parameter(description = "ID sản phẩm", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody ProductStatusUpdateRequest request
    ) {
        ProductResponse response = productService.updateProductStatus(id, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật trạng thái sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật tồn kho sản phẩm")
    @PatchMapping("/{id}/stock")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProductStock(
            @Parameter(description = "ID sản phẩm", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody ProductStockUpdateRequest request
    ) {
        ProductResponse response = productService.updateProductStock(id, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật tồn kho sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Ẩn sản phẩm khỏi public API")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> deleteProduct(
            @Parameter(description = "ID sản phẩm", example = "1")
            @PathVariable Long id
    ) {
        ProductResponse response = productService.deleteProduct(id);

        return ResponseEntity.ok(
                ApiResponse.success("Ẩn sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }
}
