package com.agri.ecommerce.controller.customer;

import com.agri.ecommerce.dto.request.payment.PaypalPaymentConfirmationRequest;
import com.agri.ecommerce.dto.response.ApiResponse;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.payment.PaymentDetailResponse;
import com.agri.ecommerce.security.UserPrincipal;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Tag(name = "Customer - Payments", description = "API quản lý thanh toán của khách hàng")
@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Lấy lịch sử thanh toán của khách hàng")
    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<PageResponse<PaymentDetailResponse>>> getPayments(
            @AuthenticationPrincipal UserPrincipal principal,

            @Parameter(description = "Trạng thái thanh toán", example = "pending")
            @RequestParam(required = false) String status,

            @Parameter(description = "Phương thức thanh toán", example = "paypal")
            @RequestParam(required = false) String paymentMethod,

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
        PageResponse<PaymentDetailResponse> response = paymentService.getCustomerPayments(
                principal.getId(),
                status,
                paymentMethod,
                from,
                to,
                page,
                size,
                sort
        );

        return ResponseEntity.ok(
                ApiResponse.success("Lấy lịch sử thanh toán thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Lấy thanh toán của một đơn hàng")
    @GetMapping("/orders/{orderId}/payment")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> getOrderPayment(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "10")
            @PathVariable Long orderId
    ) {
        PaymentDetailResponse response = paymentService.getCustomerOrderPayment(principal.getId(), orderId);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy thông tin thanh toán thành công", response, HttpStatus.OK.value())
        );
    }

    @Operation(summary = "Xác nhận thanh toán PayPal cho đơn hàng")
    @PatchMapping("/orders/{orderId}/payment/paypal/confirm")
    public ResponseEntity<ApiResponse<PaymentDetailResponse>> confirmPaypalPayment(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "ID đơn hàng", example = "10")
            @PathVariable Long orderId,
            @Valid @RequestBody PaypalPaymentConfirmationRequest request
    ) {
        PaymentDetailResponse response = paymentService.confirmPaypalPayment(principal.getId(), orderId, request);

        return ResponseEntity.ok(
                ApiResponse.success("Xác nhận thanh toán PayPal thành công", response, HttpStatus.OK.value())
        );
    }
}
