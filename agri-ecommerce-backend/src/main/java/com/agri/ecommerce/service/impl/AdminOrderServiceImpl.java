package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.order.AdminOrderStatusUpdateRequest;
import com.agri.ecommerce.dto.request.order.AssignDeliveryStaffRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.dto.response.user.UserResponse;
import com.agri.ecommerce.entity.*;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.mapper.UserMapper;
import com.agri.ecommerce.repository.*;
import com.agri.ecommerce.service.AdminOrderService;
import com.agri.ecommerce.service.NotificationService;
import com.agri.ecommerce.service.PaymentService;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminOrderServiceImpl implements AdminOrderService {

    private static final String ROLE_DELIVERY_STAFF = "delivery_staff";
    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String OUT_OF_STOCK_STATUS = "out_of_stock";
    private static final String PAYMENT_METHOD_PAYPAL = "paypal";
    private static final String PAYMENT_PENDING = "pending";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String PAYMENT_FAILED = "failed";
    private static final String PAYMENT_REFUNDED = "refunded";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_PROCESSING = "processing";
    private static final String STATUS_READY_FOR_DELIVERY = "ready_for_delivery";
    private static final String STATUS_OUT_FOR_DELIVERY = "out_for_delivery";
    private static final String STATUS_DELIVERED = "delivered";
    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_CANCELED = "canceled";
    private static final String NOTIFICATION_TYPE_ORDER = "order";
    private static final String NOTIFICATION_TYPE_DELIVERY = "delivery";
    private static final String NOTIFICATION_TYPE_PAYMENT = "payment";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_STATUSES = Set.of(
            STATUS_PENDING,
            STATUS_PROCESSING,
            STATUS_READY_FOR_DELIVERY,
            STATUS_OUT_FOR_DELIVERY,
            STATUS_DELIVERED,
            STATUS_COMPLETED,
            STATUS_CANCELED
    );
    private static final Set<String> TERMINAL_STATUSES = Set.of(STATUS_COMPLETED, STATUS_CANCELED);
    private static final Set<String> REFUNDABLE_PAYMENT_ORDER_STATUSES = Set.of(
            STATUS_CANCELED,
            STATUS_DELIVERED,
            STATUS_COMPLETED
    );
    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            STATUS_PENDING, Set.of(STATUS_PROCESSING, STATUS_CANCELED),
            STATUS_PROCESSING, Set.of(STATUS_READY_FOR_DELIVERY, STATUS_CANCELED),
            STATUS_READY_FOR_DELIVERY, Set.of(STATUS_OUT_FOR_DELIVERY, STATUS_CANCELED),
            STATUS_OUT_FOR_DELIVERY, Set.of(STATUS_DELIVERED),
            STATUS_DELIVERED, Set.of(STATUS_COMPLETED),
            STATUS_COMPLETED, Set.of(),
            STATUS_CANCELED, Set.of()
    );
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "subtotal", "discountAmount", "shippingFee", "totalPrice", "status", "createdAt", "updatedAt"
    );

    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    private final OrderStatusHistoryRepository orderStatusHistoryRepository;

    private final PaymentRepository paymentRepository;

    private final ProductRepository productRepository;

    private final CouponRepository couponRepository;

    private final UserRepository userRepository;

    private final NotificationService notificationService;

    private final PaymentService paymentService;

    private final OrderMapper orderMapper;

    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getOrders(
            String status,
            Long customerId,
            Long deliveryStaffId,
            int page,
            int size,
            String sort
    ) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Specification<OrderEntity> specification = buildSpecification(
                normalizeOptionalStatus(status),
                customerId,
                deliveryStaffId
        );
        Page<OrderEntity> orderPage = orderRepository.findAll(specification, pageable);
        List<OrderResponse> content = toOrderResponses(orderPage.getContent(), false);

        return PageResponse.<OrderResponse>builder()
                .content(content)
                .page(orderPage.getNumber())
                .size(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .totalPages(orderPage.getTotalPages())
                .last(orderPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long orderId) {
        OrderEntity order = findOrderById(orderId);
        return toOrderResponse(order, true);
    }

    @Override
    @Transactional
    public OrderResponse confirmOrder(Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findOrderByIdForUpdate(orderId);

        if (!STATUS_PENDING.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận đơn hàng đang chờ xử lý");
        }

        applyStatusChange(order, STATUS_PROCESSING, cleanBlank(request == null ? null : request.getNote()));
        return toOrderResponse(orderRepository.save(order), true);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findOrderByIdForUpdate(orderId);

        applyStatusChange(order, STATUS_CANCELED, cleanBlank(request == null ? null : request.getNote()));
        return toOrderResponse(orderRepository.save(order), true);
    }

    @Override
    @Transactional
    public OrderResponse assignDeliveryStaff(Long orderId, AssignDeliveryStaffRequest request) {
        OrderEntity order = findOrderByIdForUpdate(orderId);
        UserEntity deliveryStaff = findActiveDeliveryStaffById(request.getDeliveryStaffId());

        if (STATUS_PENDING.equals(order.getStatus())) {
            throw new BadRequestException("Vui lòng xác nhận đơn hàng trước khi phân nhân viên giao hàng");
        }

        if (TERMINAL_STATUSES.contains(order.getStatus()) || STATUS_DELIVERED.equals(order.getStatus())) {
            throw new BadRequestException("Không thể phân nhân viên giao hàng cho đơn hàng đã kết thúc");
        }

        order.setDeliveryStaff(deliveryStaff);
        OrderEntity savedOrder = orderRepository.save(order);

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                savedOrder.getStatus(),
                buildAssignmentNote(deliveryStaff, request.getNote())
        ));
        notifyUser(
                deliveryStaff.getId(),
                NOTIFICATION_TYPE_DELIVERY,
                "Bạn được phân công giao đơn hàng #" + savedOrder.getId(),
                buildDeliveryOrderLink(savedOrder.getId())
        );
        notifyUser(
                savedOrder.getUser().getId(),
                NOTIFICATION_TYPE_ORDER,
                "Đơn hàng #" + savedOrder.getId() + " đã được phân công nhân viên giao hàng",
                buildOrderLink(savedOrder.getId())
        );

        return toOrderResponse(savedOrder, true);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, AdminOrderStatusUpdateRequest request) {
        OrderEntity order = findOrderByIdForUpdate(orderId);
        String nextStatus = normalizeRequiredStatus(request.getStatus());

        applyStatusChange(order, nextStatus, cleanBlank(request.getNote()));
        return toOrderResponse(orderRepository.save(order), true);
    }

    @Override
    @Transactional
    public OrderResponse refundOrderPayment(Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findOrderByIdForUpdate(orderId);
        String note = cleanBlank(request == null ? null : request.getNote());

        refundLatestCompletedPayment(order, note);
        orderStatusHistoryRepository.save(createStatusHistory(
                order,
                order.getStatus(),
                buildPaymentRefundHistoryNote(note)
        ));

        return toOrderResponse(orderRepository.save(order), true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getActiveDeliveryStaff() {
        return userRepository.findByRole_NameAndStatus(ROLE_DELIVERY_STAFF, UserStatus.active, Sort.by("name").ascending())
                .stream()
                .map(userMapper::toUserResponse)
                .toList();
    }

    private void applyStatusChange(OrderEntity order, String nextStatus, String note) {
        String currentStatus = order.getStatus();

        if (nextStatus.equals(currentStatus)) {
            throw new BadRequestException("Đơn hàng đã ở trạng thái " + nextStatus);
        }

        if (!ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of()).contains(nextStatus)) {
            throw new BadRequestException("Không thể chuyển trạng thái đơn hàng từ " + currentStatus + " sang " + nextStatus);
        }

        if (STATUS_PROCESSING.equals(nextStatus)) {
            validatePaymentBeforeProcessing(order);
        }

        if (STATUS_OUT_FOR_DELIVERY.equals(nextStatus) && order.getDeliveryStaff() == null) {
            throw new BadRequestException("Cần phân nhân viên giao hàng trước khi chuyển sang trạng thái đang giao");
        }

        order.setStatus(nextStatus);

        if (STATUS_OUT_FOR_DELIVERY.equals(nextStatus)) {
            order.setDispatchedAt(LocalDateTime.now());
        }

        if (STATUS_DELIVERED.equals(nextStatus)) {
            order.setDeliveredAt(LocalDateTime.now());
            paymentService.completeCashPaymentIfPending(order.getId());
        }

        if (STATUS_CANCELED.equals(nextStatus)) {
            restoreInventoryAndCoupon(order);
            settlePaymentForCanceledOrder(order, note);
        }

        orderStatusHistoryRepository.save(createStatusHistory(order, nextStatus, note));
        notifyStatusChange(order, nextStatus);
    }

    private void notifyStatusChange(OrderEntity order, String nextStatus) {
        Long orderId = order.getId();
        Long customerId = order.getUser().getId();

        if (STATUS_PROCESSING.equals(nextStatus)) {
            notifyUser(customerId, NOTIFICATION_TYPE_ORDER, "Đơn hàng #" + orderId + " đã được xác nhận", buildOrderLink(orderId));
        }

        if (STATUS_READY_FOR_DELIVERY.equals(nextStatus)) {
            notifyUser(customerId, NOTIFICATION_TYPE_ORDER, "Đơn hàng #" + orderId + " đã sẵn sàng giao", buildOrderLink(orderId));

            if (order.getDeliveryStaff() != null) {
                notifyUser(
                        order.getDeliveryStaff().getId(),
                        NOTIFICATION_TYPE_DELIVERY,
                        "Đơn hàng #" + orderId + " đã sẵn sàng để giao",
                        buildDeliveryOrderLink(orderId)
                );
            }
        }

        if (STATUS_OUT_FOR_DELIVERY.equals(nextStatus)) {
            notifyUser(customerId, NOTIFICATION_TYPE_ORDER, "Đơn hàng #" + orderId + " đang được giao", buildOrderLink(orderId));
        }

        if (STATUS_DELIVERED.equals(nextStatus)) {
            notifyUser(customerId, NOTIFICATION_TYPE_ORDER, "Đơn hàng #" + orderId + " đã được giao thành công", buildOrderLink(orderId));
        }

        if (STATUS_COMPLETED.equals(nextStatus)) {
            notifyUser(customerId, NOTIFICATION_TYPE_ORDER, "Đơn hàng #" + orderId + " đã hoàn tất", buildOrderLink(orderId));
        }

        if (STATUS_CANCELED.equals(nextStatus)) {
            notifyUser(customerId, NOTIFICATION_TYPE_ORDER, "Đơn hàng #" + orderId + " đã bị hủy", buildOrderLink(orderId));
        }
    }

    private void notifyUser(Long userId, String type, String message, String link) {
        notificationService.createNotification(userId, type, message, link);
    }

    private String buildOrderLink(Long orderId) {
        return "/orders/" + orderId;
    }

    private String buildDeliveryOrderLink(Long orderId) {
        return "/delivery/orders/" + orderId;
    }

    private Optional<PaymentEntity> findLatestPaymentForUpdate(Long orderId) {
        return paymentRepository.findByOrderIdForUpdateOrderByCreatedAtDesc(orderId)
                .stream()
                .findFirst();
    }

    private void settlePaymentForCanceledOrder(OrderEntity order, String note) {
        findLatestPaymentForUpdate(order.getId())
                .ifPresent(payment -> {
                    if (PAYMENT_PENDING.equals(payment.getStatus())) {
                        payment.setStatus(PAYMENT_FAILED);
                        payment.setPaidAt(null);
                        paymentRepository.save(payment);
                        return;
                    }

                    if (PAYMENT_COMPLETED.equals(payment.getStatus())) {
                        refundPayment(payment, buildCancelRefundNote(note));
                    }
                });
    }

    private void refundLatestCompletedPayment(OrderEntity order, String note) {
        if (!REFUNDABLE_PAYMENT_ORDER_STATUSES.contains(order.getStatus())) {
            throw new BadRequestException("Cancel the order before refunding active order payments");
        }

        PaymentEntity payment = findLatestPaymentForUpdate(order.getId())
                .orElseThrow(() -> new BadRequestException("Order has no payment information"));

        if (PAYMENT_REFUNDED.equals(payment.getStatus())) {
            throw new BadRequestException("Payment has already been refunded");
        }

        if (!PAYMENT_COMPLETED.equals(payment.getStatus())) {
            throw new BadRequestException("Only completed payments can be refunded");
        }

        refundPayment(payment, note);
    }

    private void refundPayment(PaymentEntity payment, String note) {
        payment.setStatus(PAYMENT_REFUNDED);
        PaymentEntity savedPayment = paymentRepository.save(payment);

        notifyUser(
                savedPayment.getOrder().getUser().getId(),
                NOTIFICATION_TYPE_PAYMENT,
                buildRefundNotification(savedPayment.getOrder().getId(), note),
                buildOrderLink(savedPayment.getOrder().getId())
        );
    }

    private String buildCancelRefundNote(String note) {
        if (note == null) {
            return "Payment refunded because the order was canceled";
        }

        return "Payment refunded because the order was canceled. " + note;
    }

    private String buildPaymentRefundHistoryNote(String note) {
        if (note == null) {
            return "Payment refunded by admin";
        }

        return "Payment refunded by admin. " + note;
    }

    private String buildRefundNotification(Long orderId, String note) {
        String message = "Payment for order #" + orderId + " has been refunded";

        if (note == null) {
            return message;
        }

        return message + ". " + note;
    }

    private void validatePaymentBeforeProcessing(OrderEntity order) {
        PaymentEntity payment = findLatestPaymentForUpdate(order.getId())
                .orElseThrow(() -> new BadRequestException("Order has no payment information"));

        if (PAYMENT_FAILED.equals(payment.getStatus()) || PAYMENT_REFUNDED.equals(payment.getStatus())) {
            throw new BadRequestException("Cannot confirm an order with failed or refunded payment");
        }

        if (PAYMENT_METHOD_PAYPAL.equals(payment.getPaymentMethod()) && !PAYMENT_COMPLETED.equals(payment.getStatus())) {
            throw new BadRequestException("PayPal orders must be paid before confirmation");
        }
    }

    private void restoreInventoryAndCoupon(OrderEntity order) {
        List<OrderItemEntity> orderItems = orderItemRepository.findByOrder_IdOrderByIdAsc(order.getId());
        restoreProductStock(orderItems);
        releaseCouponUsage(order);
    }

    private void restoreProductStock(List<OrderItemEntity> orderItems) {
        if (orderItems.isEmpty()) {
            return;
        }

        Map<Long, Integer> quantityByProductId = new LinkedHashMap<>();
        orderItems.forEach(orderItem -> quantityByProductId.merge(
                orderItem.getProduct().getId(),
                orderItem.getQuantity(),
                Integer::sum
        ));

        Map<Long, ProductEntity> productsById = productRepository.findAllByIdInForUpdate(quantityByProductId.keySet())
                .stream()
                .collect(Collectors.toMap(ProductEntity::getId, Function.identity()));

        quantityByProductId.forEach((productId, quantity) -> {
            ProductEntity product = productsById.get(productId);
            if (product == null) {
                return;
            }

            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int restoredStock = currentStock + quantity;
            product.setStock(restoredStock);

            if (restoredStock > 0 && OUT_OF_STOCK_STATUS.equals(product.getStatus())) {
                product.setStatus(IN_STOCK_STATUS);
            }
        });

        productRepository.saveAll(productsById.values());
    }

    private void releaseCouponUsage(OrderEntity order) {
        CouponEntity coupon = order.getCoupon();

        if (coupon == null) {
            return;
        }

        int timesUsed = coupon.getTimesUsed() == null ? 0 : coupon.getTimesUsed();
        if (timesUsed > 0) {
            coupon.setTimesUsed(timesUsed - 1);
            couponRepository.save(coupon);
        }
    }

    private List<OrderResponse> toOrderResponses(List<OrderEntity> orders, boolean includeStatusHistory) {
        if (orders.isEmpty()) {
            return List.of();
        }

        List<Long> orderIds = orders.stream().map(OrderEntity::getId).toList();
        Map<Long, List<OrderItemEntity>> itemsByOrderId = orderItemRepository.findByOrder_IdInOrderByIdAsc(orderIds)
                .stream()
                .collect(Collectors.groupingBy(orderItem -> orderItem.getOrder().getId(), LinkedHashMap::new, Collectors.toList()));
        Map<Long, PaymentEntity> paymentsByOrderId = paymentRepository.findByOrder_IdInOrderByCreatedAtDesc(orderIds)
                .stream()
                .collect(Collectors.toMap(
                        payment -> payment.getOrder().getId(),
                        Function.identity(),
                        (latest, ignored) -> latest,
                        LinkedHashMap::new
                ));
        Map<Long, List<OrderStatusHistoryEntity>> historyByOrderId = includeStatusHistory
                ? orderStatusHistoryRepository.findByOrder_IdInOrderByChangedAtAsc(orderIds)
                        .stream()
                        .collect(Collectors.groupingBy(history -> history.getOrder().getId(), LinkedHashMap::new, Collectors.toList()))
                : Map.of();

        return orders.stream()
                .map(order -> orderMapper.toOrderResponse(
                        order,
                        itemsByOrderId.getOrDefault(order.getId(), List.of()),
                        paymentsByOrderId.get(order.getId()),
                        historyByOrderId.getOrDefault(order.getId(), List.of())
                ))
                .toList();
    }

    private OrderResponse toOrderResponse(OrderEntity order, boolean includeStatusHistory) {
        List<OrderItemEntity> orderItems = orderItemRepository.findByOrder_IdOrderByIdAsc(order.getId());
        PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(order.getId()).orElse(null);
        List<OrderStatusHistoryEntity> statusHistory = includeStatusHistory
                ? orderStatusHistoryRepository.findByOrder_IdOrderByChangedAtAsc(order.getId())
                : List.of();

        return orderMapper.toOrderResponse(order, orderItems, payment, statusHistory);
    }

    private Specification<OrderEntity> buildSpecification(String status, Long customerId, Long deliveryStaffId) {
        return Specification.where(hasStatus(status))
                .and(hasCustomerId(customerId))
                .and(hasDeliveryStaffId(deliveryStaffId));
    }

    private Specification<OrderEntity> hasStatus(String status) {
        return (root, query, criteriaBuilder) ->
                status == null ? criteriaBuilder.conjunction() : criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<OrderEntity> hasCustomerId(Long customerId) {
        return (root, query, criteriaBuilder) -> {
            if (customerId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(root.join("user", JoinType.INNER).get("id"), customerId);
        };
    }

    private Specification<OrderEntity> hasDeliveryStaffId(Long deliveryStaffId) {
        return (root, query, criteriaBuilder) -> {
            if (deliveryStaffId == null) {
                return criteriaBuilder.conjunction();
            }

            return criteriaBuilder.equal(root.join("deliveryStaff", JoinType.LEFT).get("id"), deliveryStaffId);
        };
    }

    private OrderStatusHistoryEntity createStatusHistory(OrderEntity order, String status, String note) {
        return OrderStatusHistoryEntity.builder()
                .order(order)
                .status(status)
                .changedAt(LocalDateTime.now())
                .note(note)
                .build();
    }

    private String buildAssignmentNote(UserEntity deliveryStaff, String note) {
        String cleanNote = cleanBlank(note);
        String assignmentNote = "Assigned delivery staff: " + deliveryStaff.getName() + " (#" + deliveryStaff.getId() + ")";

        if (cleanNote == null) {
            return assignmentNote;
        }

        return assignmentNote + ". " + cleanNote;
    }

    private UserEntity findActiveDeliveryStaffById(Long deliveryStaffId) {
        UserEntity user = userRepository.findById(deliveryStaffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên giao hàng với id: " + deliveryStaffId));

        RoleEntity role = user.getRole();
        if (user.getStatus() != UserStatus.active || role == null || !ROLE_DELIVERY_STAFF.equals(role.getName())) {
            throw new BadRequestException("Người dùng được phân công phải là nhân viên giao hàng đang hoạt động");
        }

        return user;
    }

    private OrderEntity findOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với id: " + orderId));
    }

    private OrderEntity findOrderByIdForUpdate(Long orderId) {
        return orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với id: " + orderId));
    }

    private String normalizeOptionalStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        return normalizeStatus(normalizedStatus);
    }

    private String normalizeRequiredStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            throw new BadRequestException("Trạng thái đơn hàng không được để trống");
        }

        return normalizeStatus(normalizedStatus);
    }

    private String normalizeStatus(String status) {
        String normalizedStatus = status.toLowerCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Trạng thái đơn hàng không hợp lệ. Giá trị hợp lệ: pending, processing, ready_for_delivery, out_for_delivery, delivered, completed, canceled");
        }

        return normalizedStatus;
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

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
