package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.payment.AdminPaymentStatusUpdateRequest;
import com.agri.ecommerce.dto.request.payment.PaymentRefundRequest;
import com.agri.ecommerce.dto.request.payment.PaypalPaymentConfirmationRequest;
import com.agri.ecommerce.dto.request.payment.VnpayPaymentUrlRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.payment.PaymentDetailResponse;
import com.agri.ecommerce.dto.response.payment.VnpayIpnResponse;
import com.agri.ecommerce.dto.response.payment.VnpayPaymentUrlResponse;
import com.agri.ecommerce.dto.response.payment.VnpayReturnResponse;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.config.VnpayProperties;
import com.agri.ecommerce.mapper.PaymentMapper;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.service.NotificationService;
import com.agri.ecommerce.service.PaymentService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final String PAYMENT_METHOD_CASH = "cash";
    private static final String PAYMENT_METHOD_PAYPAL = "paypal";
    private static final String PAYMENT_METHOD_VNPAY = "vnpay";
    private static final String PAYMENT_PENDING = "pending";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String PAYMENT_FAILED = "failed";
    private static final String PAYMENT_REFUNDED = "refunded";
    private static final String ORDER_CANCELED = "canceled";
    private static final String ORDER_DELIVERED = "delivered";
    private static final String ORDER_COMPLETED = "completed";
    private static final String NOTIFICATION_TYPE_PAYMENT = "payment";
    private static final String VNPAY_SUCCESS_CODE = "00";
    private static final String VNPAY_HASH_PARAM = "vnp_SecureHash";
    private static final String VNPAY_HASH_TYPE_PARAM = "vnp_SecureHashType";
    private static final ZoneId VNPAY_ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_PAYMENT_METHODS = Set.of(
            PAYMENT_METHOD_CASH,
            PAYMENT_METHOD_PAYPAL,
            PAYMENT_METHOD_VNPAY
    );
    private static final Set<String> ALLOWED_PAYMENT_STATUSES = Set.of(
            PAYMENT_PENDING,
            PAYMENT_COMPLETED,
            PAYMENT_FAILED,
            PAYMENT_REFUNDED
    );
    private static final Set<String> ADMIN_MUTABLE_PAYMENT_STATUSES = Set.of(PAYMENT_COMPLETED, PAYMENT_FAILED);
    private static final Set<String> REFUNDABLE_ORDER_STATUSES = Set.of(
            ORDER_CANCELED,
            ORDER_DELIVERED,
            ORDER_COMPLETED
    );
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "amount", "paymentMethod", "status", "paidAt", "createdAt", "updatedAt"
    );

    private final PaymentRepository paymentRepository;

    private final NotificationService notificationService;

    private final PaymentMapper paymentMapper;

    private final VnpayProperties vnpayProperties;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PaymentDetailResponse> getCustomerPayments(
            Long userId,
            String status,
            String paymentMethod,
            LocalDateTime from,
            LocalDateTime to,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);
        validateDateRange(from, to);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<PaymentEntity> paymentPage = paymentRepository.findAll(
                Specification.where(hasCustomerId(userId))
                        .and(hasStatus(normalizeOptionalStatus(status)))
                        .and(hasPaymentMethod(normalizeOptionalPaymentMethod(paymentMethod)))
                        .and(createdAtGreaterThanOrEqual(from))
                        .and(createdAtLessThanOrEqual(to)),
                pageable
        );

        return toPageResponse(paymentPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDetailResponse getCustomerOrderPayment(Long userId, Long orderId) {
        PaymentEntity payment = findLatestPaymentByOrderIdAndUserId(orderId, userId);
        return paymentMapper.toPaymentDetailResponse(payment);
    }

    @Override
    @Transactional
    public PaymentDetailResponse confirmPaypalPayment(Long userId, Long orderId, PaypalPaymentConfirmationRequest request) {
        PaymentEntity payment = paymentRepository.findFirstByOrder_IdAndOrder_User_IdOrderByCreatedAtDesc(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán cho đơn hàng với id: " + orderId));
        String transactionId = normalizeRequiredTransactionId(request.getTransactionId());

        if (PAYMENT_COMPLETED.equals(payment.getStatus()) && sameText(payment.getTransactionId(), transactionId)) {
            return paymentMapper.toPaymentDetailResponse(payment);
        }

        validateCustomerPaypalConfirmation(payment, transactionId);
        payment.setTransactionId(transactionId);
        payment.setStatus(PAYMENT_COMPLETED);
        payment.setPaidAt(LocalDateTime.now());
        PaymentEntity savedPayment = paymentRepository.save(payment);

        notifyCustomerPaymentChange(
                savedPayment,
                "Thanh toán PayPal cho đơn hàng #" + orderId + " đã được xác nhận"
        );

        return paymentMapper.toPaymentDetailResponse(savedPayment);
    }

    @Override
    @Transactional(readOnly = true)
    public VnpayPaymentUrlResponse createVnpayPaymentUrl(
            Long userId,
            Long orderId,
            VnpayPaymentUrlRequest request,
            String clientIp
    ) {
        validateVnpayConfiguration();

        PaymentEntity payment = paymentRepository.findFirstByOrder_IdAndOrder_User_IdOrderByCreatedAtDesc(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán cho đơn hàng với id: " + orderId));
        validateVnpayPaymentCanStart(payment);

        ZonedDateTime createdAt = ZonedDateTime.now(VNPAY_ZONE_ID);
        ZonedDateTime expiresAt = createdAt.plusMinutes(Math.max(vnpayProperties.getExpireMinutes(), 1));
        String txnRef = String.valueOf(orderId);
        String locale = cleanBlank(request == null ? null : request.getLocale());
        String bankCode = cleanBlank(request == null ? null : request.getBankCode());

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", vnpayProperties.getVersion());
        params.put("vnp_Command", vnpayProperties.getCommand());
        params.put("vnp_TmnCode", vnpayProperties.getTmnCode());
        params.put("vnp_Amount", toVnpayAmount(payment.getAmount()));
        params.put("vnp_CurrCode", vnpayProperties.getCurrencyCode());
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", "Thanh toan don hang #" + orderId);
        params.put("vnp_OrderType", vnpayProperties.getOrderType());
        params.put("vnp_Locale", locale == null ? vnpayProperties.getLocale() : locale);
        params.put("vnp_ReturnUrl", vnpayProperties.getReturnUrl());
        params.put("vnp_IpAddr", cleanBlank(clientIp) == null ? "127.0.0.1" : clientIp);
        params.put("vnp_CreateDate", VNPAY_DATE_FORMATTER.format(createdAt));
        params.put("vnp_ExpireDate", VNPAY_DATE_FORMATTER.format(expiresAt));
        if (bankCode != null) {
            params.put("vnp_BankCode", bankCode);
        }

        String secureHash = hmacSha512(vnpayProperties.getHashSecret(), buildHashData(params));
        String paymentUrl = vnpayProperties.getPayUrl()
                + "?"
                + buildQuery(params)
                + "&"
                + VNPAY_HASH_PARAM
                + "="
                + secureHash;

        return VnpayPaymentUrlResponse.builder()
                .orderId(orderId)
                .paymentId(payment.getId())
                .txnRef(txnRef)
                .amount(payment.getAmount())
                .paymentUrl(paymentUrl)
                .expiresAt(expiresAt.toLocalDateTime())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public VnpayReturnResponse verifyVnpayReturn(Map<String, String> params) {
        boolean validSignature = hasValidVnpaySignature(params);
        Long orderId = parseLong(cleanBlank(params.get("vnp_TxnRef")));
        PaymentEntity payment = orderId == null
                ? null
                : paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(orderId).orElse(null);

        return VnpayReturnResponse.builder()
                .validSignature(validSignature)
                .orderId(orderId)
                .paymentStatus(payment == null ? null : payment.getStatus())
                .responseCode(cleanBlank(params.get("vnp_ResponseCode")))
                .transactionStatus(cleanBlank(params.get("vnp_TransactionStatus")))
                .transactionNo(cleanBlank(params.get("vnp_TransactionNo")))
                .bankCode(cleanBlank(params.get("vnp_BankCode")))
                .amount(fromVnpayAmount(cleanBlank(params.get("vnp_Amount"))))
                .orderInfo(cleanBlank(params.get("vnp_OrderInfo")))
                .message(buildVnpayReturnMessage(validSignature, params, payment))
                .build();
    }

    @Override
    @Transactional
    public VnpayIpnResponse handleVnpayIpn(Map<String, String> params) {
        if (!hasValidVnpaySignature(params)) {
            return new VnpayIpnResponse("97", "Invalid checksum");
        }

        Long orderId = parseLong(cleanBlank(params.get("vnp_TxnRef")));
        if (orderId == null) {
            return new VnpayIpnResponse("01", "Order not found");
        }

        PaymentEntity payment = paymentRepository.findByOrderIdForUpdateOrderByCreatedAtDesc(orderId)
                .stream()
                .findFirst()
                .orElse(null);
        if (payment == null || !PAYMENT_METHOD_VNPAY.equals(payment.getPaymentMethod())) {
            return new VnpayIpnResponse("01", "Order not found");
        }

        BigDecimal ipnAmount = fromVnpayAmount(cleanBlank(params.get("vnp_Amount")));
        if (ipnAmount == null || payment.getAmount().compareTo(ipnAmount) != 0) {
            return new VnpayIpnResponse("04", "Invalid amount");
        }

        if (!PAYMENT_PENDING.equals(payment.getStatus())) {
            return new VnpayIpnResponse("02", "Order already confirmed");
        }

        String transactionNo = cleanBlank(params.get("vnp_TransactionNo"));
        boolean success = VNPAY_SUCCESS_CODE.equals(params.get("vnp_ResponseCode"))
                && VNPAY_SUCCESS_CODE.equals(params.get("vnp_TransactionStatus"));

        if (success) {
            if (transactionNo != null) {
                if (paymentRepository.existsByTransactionIdIgnoreCaseAndIdNot(transactionNo, payment.getId())) {
                    return new VnpayIpnResponse("02", "Order already confirmed");
                }
                payment.setTransactionId(transactionNo);
            }
            payment.setStatus(PAYMENT_COMPLETED);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);
            notifyCustomerPaymentChange(
                    payment,
                    "Thanh toán VNPay cho đơn hàng #" + orderId + " đã thành công"
            );
        } else {
            if (transactionNo != null) {
                payment.setTransactionId(transactionNo);
            }
            payment.setStatus(PAYMENT_FAILED);
            payment.setPaidAt(null);
            paymentRepository.save(payment);
            notifyCustomerPaymentChange(
                    payment,
                    "Thanh toán VNPay cho đơn hàng #" + orderId + " không thành công"
            );
        }

        return new VnpayIpnResponse("00", "Confirm success");
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PaymentDetailResponse> getAdminPayments(
            String status,
            String paymentMethod,
            Long orderId,
            Long customerId,
            LocalDateTime from,
            LocalDateTime to,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);
        validateDateRange(from, to);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<PaymentEntity> paymentPage = paymentRepository.findAll(
                Specification.where(hasStatus(normalizeOptionalStatus(status)))
                        .and(hasPaymentMethod(normalizeOptionalPaymentMethod(paymentMethod)))
                        .and(hasOrderId(orderId))
                        .and(hasCustomerId(customerId))
                        .and(createdAtGreaterThanOrEqual(from))
                        .and(createdAtLessThanOrEqual(to)),
                pageable
        );

        return toPageResponse(paymentPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDetailResponse getAdminPayment(Long paymentId) {
        PaymentEntity payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán với id: " + paymentId));

        return paymentMapper.toPaymentDetailResponse(payment);
    }

    @Override
    @Transactional
    public PaymentDetailResponse updatePaymentStatus(Long paymentId, AdminPaymentStatusUpdateRequest request) {
        PaymentEntity payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán với id: " + paymentId));
        String nextStatus = normalizeAdminMutableStatus(request.getStatus());
        String transactionId = cleanBlank(request.getTransactionId());

        validateAdminStatusUpdate(payment, nextStatus, transactionId);
        applyPaymentStatus(payment, nextStatus, transactionId);
        PaymentEntity savedPayment = paymentRepository.save(payment);

        notifyCustomerPaymentChange(
                savedPayment,
                buildAdminPaymentNotification(savedPayment, cleanBlank(request.getNote()))
        );

        return paymentMapper.toPaymentDetailResponse(savedPayment);
    }

    @Override
    @Transactional
    public PaymentDetailResponse refundAdminPayment(Long paymentId, PaymentRefundRequest request) {
        PaymentEntity payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));
        String note = cleanBlank(request == null ? null : request.getNote());

        validateAdminRefund(payment);
        payment.setStatus(PAYMENT_REFUNDED);
        PaymentEntity savedPayment = paymentRepository.save(payment);

        notifyCustomerPaymentChange(
                savedPayment,
                buildRefundNotification(savedPayment, note)
        );

        return paymentMapper.toPaymentDetailResponse(savedPayment);
    }

    @Override
    @Transactional
    public void completeCashPaymentIfPending(Long orderId) {
        paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(orderId)
                .filter(payment -> PAYMENT_PENDING.equals(payment.getStatus()))
                .filter(payment -> PAYMENT_METHOD_CASH.equals(payment.getPaymentMethod()))
                .ifPresent(payment -> {
                    payment.setStatus(PAYMENT_COMPLETED);
                    payment.setPaidAt(LocalDateTime.now());
                    paymentRepository.save(payment);
                });
    }

    private void validateVnpayConfiguration() {
        if (cleanBlank(vnpayProperties.getPayUrl()) == null
                || cleanBlank(vnpayProperties.getTmnCode()) == null
                || cleanBlank(vnpayProperties.getHashSecret()) == null
                || cleanBlank(vnpayProperties.getReturnUrl()) == null) {
            throw new BadRequestException("VNPay chưa được cấu hình. Vui lòng thiết lập VNPAY_TMN_CODE và VNPAY_HASH_SECRET trong agri-ecommerce-backend/.env rồi khởi động lại backend");
        }
    }

    private void validateVnpayPaymentCanStart(PaymentEntity payment) {
        OrderEntity order = payment.getOrder();
        if (order != null && ORDER_CANCELED.equals(order.getStatus())) {
            throw new BadRequestException("Không thể thanh toán VNPay cho đơn hàng đã hủy");
        }

        if (!PAYMENT_METHOD_VNPAY.equals(payment.getPaymentMethod())) {
            throw new BadRequestException("Đơn hàng này không sử dụng phương thức thanh toán VNPay");
        }

        if (!PAYMENT_PENDING.equals(payment.getStatus())) {
            throw new BadRequestException("Chỉ có thể tạo link VNPay cho thanh toán đang chờ xử lý");
        }
    }

    private boolean hasValidVnpaySignature(Map<String, String> params) {
        String requestHash = cleanBlank(params.get(VNPAY_HASH_PARAM));
        if (requestHash == null) {
            return false;
        }

        Map<String, String> signParams = params.entrySet()
                .stream()
                .filter(entry -> entry.getValue() != null)
                .filter(entry -> !VNPAY_HASH_PARAM.equals(entry.getKey()))
                .filter(entry -> !VNPAY_HASH_TYPE_PARAM.equals(entry.getKey()))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (first, ignored) -> first,
                        TreeMap::new
                ));
        String expectedHash = hmacSha512(vnpayProperties.getHashSecret(), buildHashData(signParams));

        return MessageDigest.isEqual(
                requestHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
                expectedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
        );
    }

    private String buildHashData(Map<String, String> params) {
        return params.entrySet()
                .stream()
                .filter(entry -> cleanBlank(entry.getValue()) != null)
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private String buildQuery(Map<String, String> params) {
        return params.entrySet()
                .stream()
                .filter(entry -> cleanBlank(entry.getValue()) != null)
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private String hmacSha512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hash = new StringBuilder(hmacBytes.length * 2);
            for (byte hmacByte : hmacBytes) {
                hash.append(String.format("%02x", hmacByte));
            }
            return hash.toString();
        } catch (Exception exception) {
            throw new BadRequestException("Không thể tạo chữ ký VNPay");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String toVnpayAmount(BigDecimal amount) {
        return amount
                .setScale(2, RoundingMode.HALF_UP)
                .movePointRight(2)
                .setScale(0, RoundingMode.HALF_UP)
                .toPlainString();
    }

    private BigDecimal fromVnpayAmount(String value) {
        if (value == null) {
            return null;
        }

        try {
            return new BigDecimal(value)
                    .movePointLeft(2)
                    .setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Long parseLong(String value) {
        if (value == null) {
            return null;
        }

        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String buildVnpayReturnMessage(boolean validSignature, Map<String, String> params, PaymentEntity payment) {
        if (!validSignature) {
            return "Chữ ký VNPay không hợp lệ";
        }

        if (payment == null) {
            return "Không tìm thấy thanh toán cho đơn hàng";
        }

        if (PAYMENT_COMPLETED.equals(payment.getStatus())) {
            return "Thanh toán VNPay thành công";
        }

        if (PAYMENT_FAILED.equals(payment.getStatus())) {
            return "Thanh toán VNPay không thành công";
        }

        if (VNPAY_SUCCESS_CODE.equals(params.get("vnp_ResponseCode"))
                && VNPAY_SUCCESS_CODE.equals(params.get("vnp_TransactionStatus"))) {
            return "VNPay đã ghi nhận giao dịch, hệ thống đang chờ IPN xác nhận";
        }

        return "Giao dịch VNPay chưa hoàn tất";
    }

    private void validateCustomerPaypalConfirmation(PaymentEntity payment, String transactionId) {
        OrderEntity order = payment.getOrder();
        if (order != null && ORDER_CANCELED.equals(order.getStatus())) {
            throw new BadRequestException("Không thể xác nhận thanh toán cho đơn hàng đã hủy");
        }

        if (!PAYMENT_METHOD_PAYPAL.equals(payment.getPaymentMethod())) {
            throw new BadRequestException("Chỉ thanh toán PayPal mới cần xác nhận mã giao dịch");
        }

        if (PAYMENT_COMPLETED.equals(payment.getStatus())) {
            if (sameText(payment.getTransactionId(), transactionId)) {
                return;
            }

            throw new BadRequestException("Thanh toán đã hoàn tất với mã giao dịch khác");
        }

        if (!PAYMENT_PENDING.equals(payment.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận thanh toán đang chờ xử lý");
        }

        validateUniqueTransactionId(transactionId, payment.getId());
    }

    private void validateAdminStatusUpdate(PaymentEntity payment, String nextStatus, String transactionId) {
        if (PAYMENT_COMPLETED.equals(payment.getStatus())
                || PAYMENT_FAILED.equals(payment.getStatus())
                || PAYMENT_REFUNDED.equals(payment.getStatus())) {
            throw new BadRequestException("Thanh toán đã ở trạng thái kết thúc, không thể cập nhật");
        }

        if (PAYMENT_COMPLETED.equals(nextStatus)
                && !PAYMENT_METHOD_CASH.equals(payment.getPaymentMethod())
                && cleanBlank(transactionId) == null
                && cleanBlank(payment.getTransactionId()) == null) {
            throw new BadRequestException("Thanh toán online cần mã giao dịch khi chuyển sang completed");
        }

        if (cleanBlank(transactionId) != null) {
            validateUniqueTransactionId(transactionId, payment.getId());
        }
    }

    private void validateAdminRefund(PaymentEntity payment) {
        if (PAYMENT_REFUNDED.equals(payment.getStatus())) {
            throw new BadRequestException("Payment has already been refunded");
        }

        if (!PAYMENT_COMPLETED.equals(payment.getStatus())) {
            throw new BadRequestException("Only completed payments can be refunded");
        }

        OrderEntity order = payment.getOrder();
        if (order == null || !REFUNDABLE_ORDER_STATUSES.contains(order.getStatus())) {
            throw new BadRequestException("Cancel the order before refunding active order payments");
        }
    }

    private void applyPaymentStatus(PaymentEntity payment, String nextStatus, String transactionId) {
        String cleanTransactionId = cleanBlank(transactionId);
        if (cleanTransactionId != null) {
            payment.setTransactionId(cleanTransactionId);
        }

        payment.setStatus(nextStatus);
        if (PAYMENT_COMPLETED.equals(nextStatus)) {
            payment.setPaidAt(LocalDateTime.now());
        }

        if (PAYMENT_FAILED.equals(nextStatus)) {
            payment.setPaidAt(null);
        }
    }

    private void notifyCustomerPaymentChange(PaymentEntity payment, String message) {
        OrderEntity order = payment.getOrder();
        if (order == null || order.getUser() == null) {
            return;
        }

        notificationService.createNotification(
                order.getUser().getId(),
                NOTIFICATION_TYPE_PAYMENT,
                message,
                "/orders/" + order.getId()
        );
    }

    private String buildAdminPaymentNotification(PaymentEntity payment, String note) {
        String message = "Thanh toán cho đơn hàng #" + payment.getOrder().getId()
                + " đã được cập nhật sang " + payment.getStatus();

        if (note == null) {
            return message;
        }

        return message + ". " + note;
    }

    private String buildRefundNotification(PaymentEntity payment, String note) {
        String message = "Payment for order #" + payment.getOrder().getId() + " has been refunded";

        if (note == null) {
            return message;
        }

        return message + ". " + note;
    }

    private PaymentEntity findLatestPaymentByOrderIdAndUserId(Long orderId, Long userId) {
        return paymentRepository.findFirstByOrder_IdAndOrder_User_IdOrderByCreatedAtDesc(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán cho đơn hàng với id: " + orderId));
    }

    private PageResponse<PaymentDetailResponse> toPageResponse(Page<PaymentEntity> paymentPage) {
        return PageResponse.<PaymentDetailResponse>builder()
                .content(paymentPage.getContent().stream().map(paymentMapper::toPaymentDetailResponse).toList())
                .page(paymentPage.getNumber())
                .size(paymentPage.getSize())
                .totalElements(paymentPage.getTotalElements())
                .totalPages(paymentPage.getTotalPages())
                .last(paymentPage.isLast())
                .build();
    }

    private Specification<PaymentEntity> hasStatus(String status) {
        return (root, query, criteriaBuilder) ->
                status == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<PaymentEntity> hasPaymentMethod(String paymentMethod) {
        return (root, query, criteriaBuilder) ->
                paymentMethod == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("paymentMethod"), paymentMethod);
    }

    private Specification<PaymentEntity> hasOrderId(Long orderId) {
        return (root, query, criteriaBuilder) ->
                orderId == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.join("order", JoinType.INNER).get("id"), orderId);
    }

    private Specification<PaymentEntity> hasCustomerId(Long customerId) {
        return (root, query, criteriaBuilder) -> {
            if (customerId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(root.join("order", JoinType.INNER).join("user", JoinType.INNER).get("id"), customerId);
        };
    }

    private Specification<PaymentEntity> createdAtGreaterThanOrEqual(LocalDateTime from) {
        return (root, query, criteriaBuilder) ->
                from == null ? criteriaBuilder.conjunction() : criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    private Specification<PaymentEntity> createdAtLessThanOrEqual(LocalDateTime to) {
        return (root, query, criteriaBuilder) ->
                to == null ? criteriaBuilder.conjunction() : criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), to);
    }

    private String normalizeOptionalStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        normalizedStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!ALLOWED_PAYMENT_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Payment status is invalid. Valid values: pending, completed, failed, refunded");
        }

        return normalizedStatus;
    }

    private String normalizeAdminMutableStatus(String status) {
        String normalizedStatus = normalizeRequiredStatus(status);
        if (!ADMIN_MUTABLE_PAYMENT_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Admin chỉ có thể chuyển thanh toán sang completed hoặc failed");
        }

        return normalizedStatus;
    }

    private String normalizeRequiredStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            throw new BadRequestException("Trạng thái thanh toán không được để trống");
        }

        normalizedStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!ALLOWED_PAYMENT_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Payment status is invalid. Valid values: pending, completed, failed, refunded");
        }

        return normalizedStatus;
    }

    private String normalizeOptionalPaymentMethod(String paymentMethod) {
        String normalizedPaymentMethod = cleanBlank(paymentMethod);
        if (normalizedPaymentMethod == null) {
            return null;
        }

        normalizedPaymentMethod = normalizedPaymentMethod.toLowerCase(Locale.ROOT);
        if (!ALLOWED_PAYMENT_METHODS.contains(normalizedPaymentMethod)) {
            throw new BadRequestException("Phương thức thanh toán không hợp lệ. Giá trị hợp lệ: cash, paypal, vnpay");
        }

        return normalizedPaymentMethod;
    }

    private String normalizeRequiredTransactionId(String transactionId) {
        String normalizedTransactionId = cleanBlank(transactionId);
        if (normalizedTransactionId == null) {
            throw new BadRequestException("Mã giao dịch PayPal không được để trống");
        }

        return normalizedTransactionId;
    }

    private void validateUniqueTransactionId(String transactionId, Long currentPaymentId) {
        if (paymentRepository.existsByTransactionIdIgnoreCaseAndIdNot(transactionId, currentPaymentId)) {
            throw new BadRequestException("Mã giao dịch đã được sử dụng cho thanh toán khác");
        }
    }

    private Sort parseSort(String sort) {
        String cleanSort = cleanBlank(sort);
        if (cleanSort == null) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        String[] parts = cleanSort.split(",");
        String field = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new BadRequestException("Trường sắp xếp không hợp lệ: " + field);
        }

        Sort.Direction direction = Sort.Direction.DESC;
        if (parts.length > 1) {
            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException exception) {
                throw new BadRequestException("Chiều sắp xếp không hợp lệ. Giá trị hợp lệ: asc, desc");
            }
        }

        return Sort.by(direction, field);
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page phải lớn hơn hoặc bằng 0");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size phải nằm trong khoảng 1 đến " + MAX_PAGE_SIZE);
        }
    }

    private void validateDateRange(LocalDateTime from, LocalDateTime to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("from không được sau to");
        }
    }

    private boolean sameText(String first, String second) {
        return first != null && second != null && first.equalsIgnoreCase(second);
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
