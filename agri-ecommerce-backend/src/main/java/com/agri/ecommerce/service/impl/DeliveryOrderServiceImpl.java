package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.entity.*;
import com.agri.ecommerce.exception.BadRequestException;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.OrderStatusHistoryRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.service.NotificationService;
import com.agri.ecommerce.service.DeliveryOrderService;
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
public class DeliveryOrderServiceImpl implements DeliveryOrderService {

    private static final String STATUS_READY_FOR_DELIVERY = "ready_for_delivery";
    private static final String STATUS_OUT_FOR_DELIVERY = "out_for_delivery";
    private static final String STATUS_DELIVERED = "delivered";
    private static final String STATUS_COMPLETED = "completed";
    private static final String PAYMENT_PENDING = "pending";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String NOTIFICATION_TYPE_ORDER = "order";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ASSIGNED_ORDER_STATUSES = Set.of(
            STATUS_READY_FOR_DELIVERY,
            STATUS_OUT_FOR_DELIVERY,
            STATUS_DELIVERED,
            STATUS_COMPLETED
    );
    private static final Set<String> HISTORY_STATUSES = Set.of(STATUS_DELIVERED, STATUS_COMPLETED);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "subtotal", "discountAmount", "shippingFee", "totalPrice", "status", "createdAt", "updatedAt", "dispatchedAt", "deliveredAt"
    );

    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    private final OrderStatusHistoryRepository orderStatusHistoryRepository;

    private final PaymentRepository paymentRepository;

    private final NotificationService notificationService;

    private final OrderMapper orderMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getAssignedOrders(Long deliveryStaffId, String status, int page, int size, String sort) {
        validatePaging(page, size);

        String normalizedStatus = normalizeOptionalAssignedStatus(status);
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<OrderEntity> orderPage = orderRepository.findAll(
                Specification.where(hasDeliveryStaffId(deliveryStaffId)).and(hasAssignedStatus(normalizedStatus)),
                pageable
        );
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
    public PageResponse<OrderResponse> getDeliveryHistory(Long deliveryStaffId, int page, int size, String sort) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<OrderEntity> orderPage = orderRepository.findAll(
                Specification.where(hasDeliveryStaffId(deliveryStaffId)).and(hasStatusIn(HISTORY_STATUSES)),
                pageable
        );
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
    public OrderResponse getAssignedOrder(Long deliveryStaffId, Long orderId) {
        OrderEntity order = findAssignedOrderById(orderId, deliveryStaffId);
        return toOrderResponse(order, true);
    }

    @Override
    @Transactional
    public OrderResponse markOutForDelivery(Long deliveryStaffId, Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findAssignedOrderByIdForUpdate(orderId, deliveryStaffId);

        if (!STATUS_READY_FOR_DELIVERY.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể bắt đầu giao đơn hàng ở trạng thái sẵn sàng giao");
        }

        order.setStatus(STATUS_OUT_FOR_DELIVERY);
        order.setDispatchedAt(LocalDateTime.now());
        OrderEntity savedOrder = orderRepository.save(order);

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                STATUS_OUT_FOR_DELIVERY,
                cleanBlank(request == null ? null : request.getNote())
        ));
        notifyCustomer(
                savedOrder,
                "Đơn hàng #" + savedOrder.getId() + " đang được giao",
                buildOrderLink(savedOrder.getId())
        );

        return toOrderResponse(savedOrder, true);
    }

    @Override
    @Transactional
    public OrderResponse markDelivered(Long deliveryStaffId, Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findAssignedOrderByIdForUpdate(orderId, deliveryStaffId);

        if (!STATUS_OUT_FOR_DELIVERY.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận đã giao đơn hàng đang trong quá trình giao");
        }

        order.setStatus(STATUS_DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        OrderEntity savedOrder = orderRepository.save(order);
        markPaymentCompletedIfPending(savedOrder.getId());

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                STATUS_DELIVERED,
                cleanBlank(request == null ? null : request.getNote())
        ));
        notifyCustomer(
                savedOrder,
                "Đơn hàng #" + savedOrder.getId() + " đã được giao thành công",
                buildOrderLink(savedOrder.getId())
        );

        return toOrderResponse(savedOrder, true);
    }

    private void notifyCustomer(OrderEntity order, String message, String link) {
        notificationService.createNotification(order.getUser().getId(), NOTIFICATION_TYPE_ORDER, message, link);
    }

    private String buildOrderLink(Long orderId) {
        return "/orders/" + orderId;
    }

    private void markPaymentCompletedIfPending(Long orderId) {
        paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(orderId)
                .filter(payment -> PAYMENT_PENDING.equals(payment.getStatus()))
                .ifPresent(payment -> {
                    payment.setStatus(PAYMENT_COMPLETED);
                    payment.setPaidAt(LocalDateTime.now());
                    paymentRepository.save(payment);
                });
    }

    private OrderEntity findAssignedOrderById(Long orderId, Long deliveryStaffId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn giao hàng với id: " + orderId));

        validateAssignedOrder(order, deliveryStaffId);
        return order;
    }

    private OrderEntity findAssignedOrderByIdForUpdate(Long orderId, Long deliveryStaffId) {
        OrderEntity order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn giao hàng với id: " + orderId));

        validateAssignedOrder(order, deliveryStaffId);
        return order;
    }

    private void validateAssignedOrder(OrderEntity order, Long deliveryStaffId) {
        UserEntity deliveryStaff = order.getDeliveryStaff();
        if (deliveryStaff == null || !deliveryStaffId.equals(deliveryStaff.getId())) {
            throw new ResourceNotFoundException("Không tìm thấy đơn giao hàng với id: " + order.getId());
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

    private Specification<OrderEntity> hasDeliveryStaffId(Long deliveryStaffId) {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.join("deliveryStaff", JoinType.INNER).get("id"), deliveryStaffId);
    }

    private Specification<OrderEntity> hasAssignedStatus(String status) {
        if (status != null) {
            return hasStatus(status);
        }

        return hasStatusIn(ASSIGNED_ORDER_STATUSES);
    }

    private Specification<OrderEntity> hasStatus(String status) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<OrderEntity> hasStatusIn(Set<String> statuses) {
        return (root, query, criteriaBuilder) -> root.get("status").in(statuses);
    }

    private OrderStatusHistoryEntity createStatusHistory(OrderEntity order, String status, String note) {
        return OrderStatusHistoryEntity.builder()
                .order(order)
                .status(status)
                .changedAt(LocalDateTime.now())
                .note(note)
                .build();
    }

    private String normalizeOptionalAssignedStatus(String status) {
        String normalizedStatus = cleanBlank(status);
        if (normalizedStatus == null) {
            return null;
        }

        normalizedStatus = normalizedStatus.toLowerCase(Locale.ROOT);
        if (!ASSIGNED_ORDER_STATUSES.contains(normalizedStatus)) {
            throw new BadRequestException("Trạng thái đơn giao hàng không hợp lệ. Giá trị hợp lệ: ready_for_delivery, out_for_delivery, delivered, completed");
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
