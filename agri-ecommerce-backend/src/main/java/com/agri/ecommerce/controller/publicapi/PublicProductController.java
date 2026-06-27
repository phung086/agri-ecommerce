package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.product.ProductResponse;
import com.agri.ecommerce.dto.response.product.ProductSearchFacetsResponse;
import com.agri.ecommerce.dto.response.product.ProductSearchSuggestionResponse;
import com.agri.ecommerce.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Tag(name = "Public - Products", description = "API công khai cho sản phẩm")
@RestController
@RequestMapping("/api/public/products")
@RequiredArgsConstructor
public class PublicProductController {

    private final ProductService productService;

    @Operation(summary = "Get product search suggestions")
    @GetMapping("/search/suggestions")
    public ResponseEntity<ApiResponse<List<ProductSearchSuggestionResponse>>> getSearchSuggestions(
            @Parameter(description = "Search keyword", example = "rau")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Category slug", example = "rau-cu")
            @RequestParam(required = false) String categorySlug,

            @Parameter(description = "Maximum price", example = "50000")
            @RequestParam(required = false) BigDecimal maxPrice,

            @Parameter(description = "Maximum suggestions to return", example = "8")
            @RequestParam(defaultValue = "8") Integer limit
    ) {
        List<ProductSearchSuggestionResponse> response = productService.getSearchSuggestions(
                keyword,
                categorySlug,
                maxPrice,
                limit
        );

        return ResponseEntity.ok(
                ApiResponse.success("Product search suggestions loaded successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get product search facets")
    @GetMapping("/search/facets")
    public ResponseEntity<ApiResponse<ProductSearchFacetsResponse>> getSearchFacets(
            @Parameter(description = "Search keyword", example = "rau")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Category slug", example = "rau-cu")
            @RequestParam(required = false) String categorySlug,

            @Parameter(description = "Minimum price", example = "5000")
            @RequestParam(required = false) BigDecimal minPrice,

            @Parameter(description = "Maximum price", example = "50000")
            @RequestParam(required = false) BigDecimal maxPrice,

            @Parameter(description = "Product status", example = "in_stock")
            @RequestParam(required = false) String status
    ) {
        ProductSearchFacetsResponse response = productService.getSearchFacets(
                keyword,
                categorySlug,
                minPrice,
                maxPrice,
                status
        );

        return ResponseEntity.ok(
                ApiResponse.success("Product search facets loaded successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy danh sách sản phẩm public có phân trang, tìm kiếm và lọc")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getProducts(
            @Parameter(description = "Từ khóa tìm theo tên hoặc mô tả", example = "rau")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Slug danh mục", example = "rau-cu")
            @RequestParam(required = false) String categorySlug,

            @Parameter(description = "Giá tối thiểu", example = "5000")
            @RequestParam(required = false) BigDecimal minPrice,

            @Parameter(description = "Giá tối đa", example = "50000")
            @RequestParam(required = false) BigDecimal maxPrice,

            @Parameter(description = "Trạng thái sản phẩm", example = "in_stock")
            @RequestParam(defaultValue = "in_stock") String status,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "12")
            @RequestParam(defaultValue = "12") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
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
                ApiResponse.success("Lấy danh sách sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy danh sách sản phẩm nổi bật")
    @GetMapping("/featured")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getFeaturedProducts(
            @Parameter(description = "Số lượng sản phẩm cần lấy", example = "8")
            @RequestParam(defaultValue = "8") Integer limit
    ) {
        List<ProductResponse> response = productService.getFeaturedProducts(limit);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách sản phẩm nổi bật thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get related products for product detail page")
    @GetMapping("/{slug}/related")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getRelatedProducts(
            @Parameter(description = "Product slug", example = "cai-ngot-1762274283")
            @PathVariable String slug,

            @Parameter(description = "Maximum products to return", example = "8")
            @RequestParam(defaultValue = "8") Integer limit
    ) {
        List<ProductResponse> response = productService.getRelatedProducts(slug, limit);

        return ResponseEntity.ok(
                ApiResponse.success("Related products loaded successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get product detail by slug")
    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductBySlug(
            @Parameter(description = "Slug sản phẩm", example = "cai-ngot-1762274283")
            @PathVariable String slug
    ) {
        ProductResponse response = productService.getProductBySlug(slug);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }
}
