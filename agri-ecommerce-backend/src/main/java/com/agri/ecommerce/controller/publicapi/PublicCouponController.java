package com.agri.ecommerce.controller.publicapi;

import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.coupon.CouponResponse;
import com.agri.ecommerce.mapper.CouponMapper;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Public - Coupons", description = "API công khai cho mã giảm giá")
@RestController
@RequestMapping("/api/public/coupons")
@RequiredArgsConstructor
public class PublicCouponController {

    private final CouponService couponService;
    private final CouponRepository couponRepository;
    private final CouponMapper couponMapper;

    @Operation(summary = "Lấy danh sách mã giảm giá đang hoạt động")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CouponResponse>>> getActiveCoupons(
            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<CouponResponse> response = couponService.getCoupons(
                null,    // keyword
                true,    // active = true
                false,   // expired = false
                false,   // exhausted = false
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách mã giảm giá thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Validate mã giảm giá theo code")
    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<CouponResponse>> validateCoupon(
            @Parameter(description = "Mã giảm giá cần kiểm tra", example = "SUMMER25")
            @RequestParam String code
    ) {
        var coupon = couponRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));

        CouponResponse response = couponMapper.toCouponResponse(coupon);

        if (!Boolean.TRUE.equals(response.getAvailable())) {
            String reason = Boolean.TRUE.equals(response.getExpired()) ? "đã hết hạn"
                    : Boolean.TRUE.equals(response.getUsageExhausted()) ? "đã hết lượt sử dụng"
                    : "không còn hoạt động";
            return ResponseEntity.ok(
                    ApiResponse.error("Mã giảm giá " + reason, null, HttpStatus.OK.value())
            );
        }

        return ResponseEntity.ok(
                ApiResponse.success("Mã giảm giá hợp lệ", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết mã giảm giá theo ID")
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
}
