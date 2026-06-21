package com.agri.ecommerce.controller.admin;

import com.agri.ecommerce.dto.request.payment.AdminPaymentStatusUpdateRequest;
import com.agri.ecommerce.dto.request.payment.PaymentRefundRequest;
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

@Tag(name = "Admin - Payment Management", description = "Admin payment operation APIs")
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPaymentManagementController {

    private final PaymentService paymentService;

    @Operation(summary = "Get payments for admin")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PaymentDetailResponse>>> getPayments(
            @Parameter(description = "Payment status", example = "completed")
            @RequestParam(required = false) String status,

            @Parameter(description = "Payment method", example = "cash")
            @RequestParam(required = false) String paymentMethod,

            @Parameter(description = "Order ID", example = "10")
            @RequestParam(required = false) Long orderId,

            @Parameter(description = "Customer ID", example = "8")
            @RequestParam(required = false) Long customerId,

            @Parameter(description = "Payment created from", example = "2026-06-01T00:00:00")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @Parameter(description = "Payment created to", example = "2026-06-30T23:59:59")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to,

            @Parameter(description = "Page index from 0", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "10")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Sort by field,direction", example = "createdAt,desc")
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
                ApiResponse.success("Get payments successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Get payment detail for admin")
    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> getPayment(
            @Parameter(description = "Payment ID", example = "10")
            @PathVariable Long paymentId
    ) {
        PaymentDetailResponse response = paymentService.getAdminPayment(paymentId);

        return ResponseEntity.ok(
                ApiResponse.success("Get payment detail successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Refund a completed payment")
    @PatchMapping("/{paymentId}/refund")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> refundPayment(
            @Parameter(description = "Payment ID", example = "10")
            @PathVariable Long paymentId,
            @Valid @RequestBody(required = false) PaymentRefundRequest request
    ) {
        PaymentDetailResponse response = paymentService.refundAdminPayment(paymentId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Refund payment successfully", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Update payment status")
    @PatchMapping("/{paymentId}/status")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> updatePaymentStatus(
            @Parameter(description = "Payment ID", example = "10")
            @PathVariable Long paymentId,
            @Valid @RequestBody AdminPaymentStatusUpdateRequest request
    ) {
        PaymentDetailResponse response = paymentService.updatePaymentStatus(paymentId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Update payment status successfully", response, HttpStatus.OK.value())
        );
    }
}
