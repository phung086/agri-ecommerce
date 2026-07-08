package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.dto.request.review.ReviewRequest;
import com.agri.ecommerce.dto.request.review.ReviewUpdateRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.review.ReviewResponse;
import com.agri.ecommerce.dto.response.upload.UploadedImageResponse;
import com.agri.ecommerce.security.UserPrincipal;
import com.agri.ecommerce.service.CloudinaryUploadService;
import com.agri.ecommerce.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Set;

@Tag(name = "Customer - Reviews", description = "API quản lý đánh giá sản phẩm của khách hàng")
@RestController
@RequestMapping("/api/customer/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class ReviewController {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private final ReviewService reviewService;

    private final CloudinaryUploadService cloudinaryUploadService;

    @Operation(summary = "Lấy danh sách đánh giá của khách hàng hiện tại")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getMyReviews(
            @AuthenticationPrincipal UserPrincipal principal,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<ReviewResponse> response = reviewService.getMyReviews(principal.getId(), page, size, sort);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đánh giá của bạn thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Tạo đánh giá cho sản phẩm đã mua và đã giao thành công")
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ReviewRequest request
    ) {
        ReviewResponse response = reviewService.createReview(principal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đánh giá sản phẩm thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Upload anh danh gia san pham")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadedImageResponse>> uploadReviewImage(
            @RequestParam("file") MultipartFile file
    ) {
        validateImage(file);

        UploadedImageResponse response = cloudinaryUploadService.uploadImage(file, "review-images");

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Upload anh danh gia thanh cong", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Cập nhật đánh giá của khách hàng hiện tại")
    @PutMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đánh giá", example = "1")
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewUpdateRequest request
    ) {
        ReviewResponse response = reviewService.updateReview(principal.getId(), reviewId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật đánh giá sản phẩm thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xóa đánh giá của khách hàng hiện tại")
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<Void>> deleteMyReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đánh giá", example = "1")
            @PathVariable Long reviewId
    ) {
        reviewService.deleteMyReview(principal.getId(), reviewId);

        return ResponseEntity.ok(
                ApiResponse.success("Xóa đánh giá sản phẩm thành công", null, HttpStatus.OK.value())
        );
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui long chon file anh");
        }

        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BadRequestException("Anh khong duoc vuot qua 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Chi ho tro file anh jpg, png, webp hoac gif");
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Dinh dang anh khong hop le");
        }
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new BadRequestException("File anh can co phan mo rong");
        }

        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
