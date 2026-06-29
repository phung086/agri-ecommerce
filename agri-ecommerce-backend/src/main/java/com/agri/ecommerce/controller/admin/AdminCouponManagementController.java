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

@Tag(name = "Admin - Coupon Management", description = "API quan tri ma giam gia")
@RestController
@RequestMapping("/api/admin/coupons")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCouponManagementController {

    private final CouponService couponService;

    @Operation(summary = "Lay danh sach ma giam gia")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CouponResponse>>> getCoupons(
            @Parameter(description = "Tu khoa tim theo ma giam gia", example = "SUMMER")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Trang thai bat/tat", example = "true")
            @RequestParam(required = false) Boolean active,

            @Parameter(description = "Trang thai het han", example = "false")
            @RequestParam(required = false) Boolean expired,

            @Parameter(description = "Trang thai het luot su dung", example = "false")
            @RequestParam(required = false) Boolean exhausted,

            @Parameter(description = "Trang bat dau tu 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "So phan tu moi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sap xep theo field,direction", example = "createdAt,desc")
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
                ApiResponse.success("Lay danh sach ma giam gia thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Tao ma giam gia")
    @PostMapping
    public ResponseEntity<ApiResponse<CouponResponse>> createCoupon(
            @Valid @RequestBody CouponCreateRequest request
    ) {
        CouponResponse response = couponService.createCoupon(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tao ma giam gia thanh cong", response, HttpStatus.CREATED.value()));
    }

    @Operation(summary = "Lay chi tiet ma giam gia")
    @GetMapping("/{couponId}")
    public ResponseEntity<ApiResponse<CouponResponse>> getCoupon(
            @Parameter(description = "ID ma giam gia", example = "1")
            @PathVariable Long couponId
    ) {
        CouponResponse response = couponService.getCoupon(couponId);

        return ResponseEntity.ok(
                ApiResponse.success("Lay chi tiet ma giam gia thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cap nhat ma giam gia")
    @PutMapping("/{couponId}")
    public ResponseEntity<ApiResponse<CouponResponse>> updateCoupon(
            @Parameter(description = "ID ma giam gia", example = "1")
            @PathVariable Long couponId,
            @Valid @RequestBody CouponUpdateRequest request
    ) {
        CouponResponse response = couponService.updateCoupon(couponId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat ma giam gia thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Bat hoac tat ma giam gia")
    @PatchMapping("/{couponId}/status")
    public ResponseEntity<ApiResponse<CouponResponse>> updateCouponStatus(
            @Parameter(description = "ID ma giam gia", example = "1")
            @PathVariable Long couponId,
            @Valid @RequestBody CouponStatusUpdateRequest request
    ) {
        CouponResponse response = couponService.updateCouponStatus(couponId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cap nhat trang thai ma giam gia thanh cong", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xoa ma giam gia")
    @DeleteMapping("/{couponId}")
    public ResponseEntity<ApiResponse<Void>> deleteCoupon(
            @Parameter(description = "ID ma giam gia", example = "1")
            @PathVariable Long couponId
    ) {
        couponService.deleteCoupon(couponId);

        return ResponseEntity.ok(
                ApiResponse.success("Xoa ma giam gia thanh cong", null, HttpStatus.OK.value())
        );
    }
}
