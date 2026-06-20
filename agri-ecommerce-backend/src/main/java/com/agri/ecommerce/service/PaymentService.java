package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.payment.AdminPaymentStatusUpdateRequest;
import com.agri.ecommerce.dto.request.payment.PaypalPaymentConfirmationRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.payment.PaymentDetailResponse;

import java.time.LocalDateTime;

public interface PaymentService {

    PageResponse<PaymentDetailResponse> getCustomerPayments(
            Long userId,
            String status,
            String paymentMethod,
            LocalDateTime from,
            LocalDateTime to,
            int page,
            int size,
            String sort
    );

    PaymentDetailResponse getCustomerOrderPayment(Long userId, Long orderId);

    PaymentDetailResponse confirmPaypalPayment(Long userId, Long orderId, PaypalPaymentConfirmationRequest request);

    PageResponse<PaymentDetailResponse> getAdminPayments(
            String status,
            String paymentMethod,
            Long orderId,
            Long customerId,
            LocalDateTime from,
            LocalDateTime to,
            int page,
            int size,
            String sort
    );

    PaymentDetailResponse getAdminPayment(Long paymentId);

    PaymentDetailResponse updatePaymentStatus(Long paymentId, AdminPaymentStatusUpdateRequest request);

    void completeCashPaymentIfPending(Long orderId);
}
