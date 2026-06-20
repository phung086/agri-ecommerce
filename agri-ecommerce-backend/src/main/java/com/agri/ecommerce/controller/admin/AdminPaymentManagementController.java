package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.payment.AdminPaymentStatusUpdateRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.payment.PaymentDetailResponse;
import com.agri.ecommerce.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Tag(name = "Admin - Payment Management", description = "API quản trị thanh toán")
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPaymentManagementController {

    private final PaymentService paymentService;

    @Operation(summary = "Lấy danh sách thanh toán cho admin")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PaymentDetailResponse>>> getPayments(
            @Parameter(description = "Trạng thái thanh toán", example = "completed")
            @RequestParam(required = false) String status,

            @Parameter(description = "Phương thức thanh toán", example = "cash")
            @RequestParam(required = false) String paymentMethod,

            @Parameter(description = "ID đơn hàng", example = "10")
            @RequestParam(required = false) Long orderId,

            @Parameter(description = "ID khách hàng", example = "8")
            @RequestParam(required = false) Long customerId,

            @Parameter(description = "Thời điểm tạo payment từ", example = "2026-06-01T00:00:00")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @Parameter(description = "Thời điểm tạo payment đến", example = "2026-06-30T23:59:59")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to,

            @Parameter(description = "Trang bắt đầu từ 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Số phần tử mỗi trang", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sắp xếp theo field,direction", example = "createdAt,desc")
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        PageResponse<PaymentDetailResponse> response = paymentService.getAdminPayments(
                status,
                paymentMethod,
                orderId,
                customerId,
                from,
                to,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách thanh toán thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy chi tiết thanh toán cho admin")
    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> getPayment(
            @Parameter(description = "ID thanh toán", example = "10")
            @PathVariable Long paymentId
    ) {
        PaymentDetailResponse response = paymentService.getAdminPayment(paymentId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy chi tiết thanh toán thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Cập nhật trạng thái thanh toán")
    @PatchMapping("/{paymentId}/status")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> updatePaymentStatus(
            @Parameter(description = "ID thanh toán", example = "10")
            @PathVariable Long paymentId,
            @Valid @RequestBody AdminPaymentStatusUpdateRequest request
    ) {
        PaymentDetailResponse response = paymentService.updatePaymentStatus(paymentId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Cập nhật trạng thái thanh toán thành công", response, HttpStatus.OK.value())
        );
    }
}
