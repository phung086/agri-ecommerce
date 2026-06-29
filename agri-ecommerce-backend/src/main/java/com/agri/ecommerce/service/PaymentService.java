package com.agri.ecommerce.service;

import com.agri.ecommerce.dto.request.payment.AdminPaymentStatusUpdateRequest;
import com.agri.ecommerce.dto.request.payment.PaymentRefundRequest;
import com.agri.ecommerce.dto.request.payment.PaypalPaymentConfirmationRequest;
import com.agri.ecommerce.dto.request.payment.VnpayPaymentUrlRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.payment.PaymentDetailResponse;
import com.agri.ecommerce.dto.response.payment.VnpayIpnResponse;
import com.agri.ecommerce.dto.response.payment.VnpayPaymentUrlResponse;
import com.agri.ecommerce.dto.response.payment.VnpayReturnResponse;

import java.time.LocalDateTime;
import java.util.Map;

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

    VnpayPaymentUrlResponse createVnpayPaymentUrl(
            Long userId,
            Long orderId,
            VnpayPaymentUrlRequest request,
            String clientIp
    );

    VnpayReturnResponse verifyVnpayReturn(Map<String, String> params);

    VnpayIpnResponse handleVnpayIpn(Map<String, String> params);

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

    PaymentDetailResponse refundAdminPayment(Long paymentId, PaymentRefundRequest request);

    void completeCashPaymentIfPending(Long orderId);
}
