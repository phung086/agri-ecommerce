package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.review.ReviewResponse;
import com.agri.ecommerce.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Review Management", description = "API quản trị đánh giá sản phẩm")
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewManagementController {

    private final ReviewService reviewService;

    @Operation(summary = "Lấy danh sách đánh giá cho admin")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getReviews(
            @Parameter(description = "ID sản phẩm", example = "1")
            @RequestParam(required = false) Long productId,

            @Parameter(description = "ID khách hàng", example = "8")
            @RequestParam(required = false) Long userId,

            @Parameter(description = "Điểm đánh giá từ 1 đến 5", example = "5")
            @RequestParam(required = false) Integer rating,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<ReviewResponse> response = reviewService.getAdminReviews(
                productId,
                userId,
                rating,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đánh giá thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết đánh giá cho admin")
    @GetMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> getReview(
            @Parameter(description = "ID đánh giá", example = "1")
            @PathVariable Long reviewId
    ) {
        ReviewResponse response = reviewService.getAdminReview(reviewId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết đánh giá thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa đánh giá không phù hợp")
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @Parameter(description = "ID đánh giá", example = "1")
            @PathVariable Long reviewId
    ) {
        reviewService.deleteReviewAsAdmin(reviewId);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa đánh giá thành công", null, HttpStatus.OK.value())
        );
    }
}
