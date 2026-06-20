package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.coupon.CouponCreateRequest;
import com.agri.ecommerce.dto.request.coupon.CouponStatusUpdateRequest;
import com.agri.ecommerce.dto.request.coupon.CouponUpdateRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.coupon.CouponResponse;
import com.agri.ecommerce.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Coupon Management", description = "API quản trị mã giảm giá")
@RestController
@RequestMapping("/api/admin/coupons")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCouponManagementController {

    private final CouponService couponService;

    @Operation(summary = "Lấy danh sách mã giảm giá")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CouponResponse>>> getCoupons(
            @Parameter(description = "Từ khóa tìm theo mã giảm giá", example = "SUMMER")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Trạng thái bật/tắt", example = "true")
            @RequestParam(required = false) Boolean active,

            @Parameter(description = "Trạng thái hết hạn", example = "false")
            @RequestParam(required = false) Boolean expired,

            @Parameter(description = "Trạng thái hết lượt sử dụng", example = "false")
            @RequestParam(required = false) Boolean exhausted,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<CouponResponse> response = couponService.getCoupons(
                keyword,
                active,
                expired,
                exhausted,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách mã giảm giá thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Tạo mã giảm giá")
    @PostMapping
    public ResponseEntity<ApiResponse<CouponResponse>> createCoupon(
            @Valid @RequestBody CouponCreateRequest request
    ) {
        CouponResponse response = couponService.createCoupon(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mã giảm giá thành công", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Lấy chi tiết mã giảm giá")
    @GetMapping("/{couponId}")
    public ResponseEntity<ApiResponse<CouponResponse>> getCoupon(
            @Parameter(description = "ID mã giảm giá", example = "1")
            @PathVariable Long couponId
    ) {
        CouponResponse response = couponService.getCoupon(couponId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết mã giảm giá thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật mã giảm giá")
    @PutMapping("/{couponId}")
    public ResponseEntity<ApiResponse<CouponResponse>> updateCoupon(
            @Parameter(description = "ID mã giảm giá", example = "1")
            @PathVariable Long couponId,
            @Valid @RequestBody CouponUpdateRequest request
    ) {
        CouponResponse response = couponService.updateCoupon(couponId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật mã giảm giá thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Bật hoặc tắt mã giảm giá")
    @PatchMapping("/{couponId}/status")
    public ResponseEntity<ApiResponse<CouponResponse>> updateCouponStatus(
            @Parameter(description = "ID mã giảm giá", example = "1")
            @PathVariable Long couponId,
            @Valid @RequestBody CouponStatusUpdateRequest request
    ) {
        CouponResponse response = couponService.updateCouponStatus(couponId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật trạng thái mã giảm giá thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Vô hiệu hóa mã giảm giá")
    @DeleteMapping("/{couponId}")
    public ResponseEntity<ApiResponse<CouponResponse>> deactivateCoupon(
            @Parameter(description = "ID mã giảm giá", example = "1")
            @PathVariable Long couponId
    ) {
        CouponResponse response = couponService.deactivateCoupon(couponId);

        return ResponseEntity.ok(
                ApiResponse.success("Vô hiệu hóa mã giảm giá thành công", response, HttpStatus.OK.value())
        );
    }
}
