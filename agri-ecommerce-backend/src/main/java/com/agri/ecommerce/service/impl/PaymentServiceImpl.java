package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.payment.AdminPaymentStatusUpdateRequest;
import com.agri.ecommerce.dto.request.payment.PaypalPaymentConfirmationRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.payment.PaymentDetailResponse;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.exception.BadRequestException;
import com.agri.ecommerce.exception.ResourceNotFoundException;
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

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final String PAYMENT_METHOD_CASH = "cash";
    private static final String PAYMENT_METHOD_PAYPAL = "paypal";
    private static final String PAYMENT_PENDING = "pending";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String PAYMENT_FAILED = "failed";
    private static final String ORDER_CANCELED = "canceled";
    private static final String NOTIFICATION_TYPE_PAYMENT = "payment";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_PAYMENT_METHODS = Set.of(PAYMENT_METHOD_CASH, PAYMENT_METHOD_PAYPAL);
    private static final Set<String> ALLOWED_PAYMENT_STATUSES = Set.of(PAYMENT_PENDING, PAYMENT_COMPLETED, PAYMENT_FAILED);
    private static final Set<String> ADMIN_MUTABLE_PAYMENT_STATUSES = Set.of(PAYMENT_COMPLETED, PAYMENT_FAILED);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "amount", "paymentMethod", "status", "paidAt", "createdAt", "updatedAt"
    );

    private final PaymentRepository paymentRepository;

    private final NotificationService notificationService;

    private final PaymentMapper paymentMapper;

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
        if (PAYMENT_COMPLETED.equals(payment.getStatus()) || PAYMENT_FAILED.equals(payment.getStatus())) {
            throw new BadRequestException("Thanh toán đã ở trạng thái kết thúc, không thể cập nhật");
        }

        if (PAYMENT_COMPLETED.equals(nextStatus)
                && PAYMENT_METHOD_PAYPAL.equals(payment.getPaymentMethod())
                && cleanBlank(transactionId) == null
                && cleanBlank(payment.getTransactionId()) == null) {
            throw new BadRequestException("Thanh toán PayPal cần mã giao dịch khi chuyển sang completed");
        }

        if (cleanBlank(transactionId) != null) {
            validateUniqueTransactionId(transactionId, payment.getId());
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
            throw new BadRequestException("Trạng thái thanh toán không hợp lệ. Giá trị hợp lệ: pending, completed, failed");
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
            throw new BadRequestException("Trạng thái thanh toán không hợp lệ. Giá trị hợp lệ: pending, completed, failed");
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
            throw new BadRequestException("Phương thức thanh toán không hợp lệ. Giá trị hợp lệ: cash, paypal");
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
