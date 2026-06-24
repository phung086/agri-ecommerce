package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.review.ProductReviewsResponse;
import com.agri.ecommerce.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Public - Reviews", description = "API công khai cho đánh giá sản phẩm")
@RestController
@RequestMapping("/api/public/products/{productSlug}/reviews")
@RequiredArgsConstructor
public class PublicReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Lấy danh sách đánh giá công khai của sản phẩm")
    @GetMapping
    public ResponseEntity<ApiResponse<ProductReviewsResponse>> getProductReviews(
            @Parameter(description = "Slug sản phẩm", example = "cai-ngot-1762274283")
            @PathVariable String productSlug,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        ProductReviewsResponse response = reviewService.getProductReviews(productSlug, page, size, sort);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đánh giá sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }
}
