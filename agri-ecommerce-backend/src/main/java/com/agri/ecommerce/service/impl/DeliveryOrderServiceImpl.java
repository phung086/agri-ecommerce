package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.order.DeliveryConfirmRequest;
import com.agri.ecommerce.dto.request.order.DeliveryFailureRequest;
import com.agri.ecommerce.dto.request.order.DeliveryStatusUpdateRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.entity.*;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.OrderStatusHistoryRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.service.NotificationService;
import com.agri.ecommerce.service.DeliveryOrderService;
import com.agri.ecommerce.service.PaymentService;
import com.agri.ecommerce.service.EmailService;
import com.agri.ecommerce.service.LoyaltyService;
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
    private static final String STATUS_PICKING_UP = "picking_up";
    private static final String STATUS_OUT_FOR_DELIVERY = "out_for_delivery";
    private static final String STATUS_DELIVERED = "delivered";
    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_FAILED_DELIVERY_ATTEMPT = "failed_delivery_attempt";
    private static final String STATUS_REDELIVERY_REQUESTED = "redelivery_requested";
    private static final String STATUS_RETURNING = "returning";
    private static final String STATUS_RETURNED = "returned";
    private static final String NOTIFICATION_TYPE_ORDER = "order";
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ASSIGNED_ORDER_STATUSES = Set.of(
            STATUS_READY_FOR_DELIVERY,
            STATUS_PICKING_UP,
            STATUS_OUT_FOR_DELIVERY,
            STATUS_DELIVERED,
            STATUS_COMPLETED,
            STATUS_FAILED_DELIVERY_ATTEMPT,
            STATUS_REDELIVERY_REQUESTED,
            STATUS_RETURNING,
            STATUS_RETURNED
    );
    private static final Set<String> HISTORY_STATUSES = Set.of(STATUS_DELIVERED, STATUS_COMPLETED, STATUS_RETURNED);
    private static final Map<String, Set<String>> DELIVERY_STATUS_TRANSITIONS = Map.of(
            STATUS_READY_FOR_DELIVERY, Set.of(STATUS_PICKING_UP, STATUS_RETURNING),
            STATUS_PICKING_UP, Set.of(STATUS_OUT_FOR_DELIVERY, STATUS_FAILED_DELIVERY_ATTEMPT, STATUS_RETURNING),
            STATUS_OUT_FOR_DELIVERY, Set.of(STATUS_DELIVERED, STATUS_FAILED_DELIVERY_ATTEMPT, STATUS_RETURNING),
            STATUS_FAILED_DELIVERY_ATTEMPT, Set.of(STATUS_REDELIVERY_REQUESTED, STATUS_RETURNING),
            STATUS_REDELIVERY_REQUESTED, Set.of(STATUS_OUT_FOR_DELIVERY, STATUS_RETURNING),
            STATUS_RETURNING, Set.of(STATUS_RETURNED)
    );
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "subtotal", "discountAmount", "shippingFee", "totalPrice", "status", "createdAt", "updatedAt", "dispatchedAt", "deliveredAt"
    );

    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    private final OrderStatusHistoryRepository orderStatusHistoryRepository;

    private final PaymentRepository paymentRepository;

    private final NotificationService notificationService;

    private final PaymentService paymentService;

    private final EmailService emailService;

    private final OrderMapper orderMapper;

    private final LoyaltyService loyaltyService;

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
        emailService.sendOrderStatusUpdate(
                savedOrder,
                "Đang giao hàng",
                "Đơn hàng của bạn đang được giao bởi nhân viên giao hàng của AgriMarket. Vui lòng giữ liên lạc điện thoại để nhận hàng sạch tươi ngon!"
        );

        return toOrderResponse(savedOrder, true);
    }

    @Override
    @Transactional
    public OrderResponse markDelivered(Long deliveryStaffId, Long orderId, DeliveryConfirmRequest request) {
        OrderEntity order = findAssignedOrderByIdForUpdate(orderId, deliveryStaffId);

        if (!STATUS_OUT_FOR_DELIVERY.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận đã giao đơn hàng đang trong quá trình giao");
        }

        order.setStatus(STATUS_DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        if (request != null) {
            order.setDeliveryProofImage(cleanBlank(request.getProofImage()));
            order.setDeliverySignature(cleanBlank(request.getSignature()));
        }
        OrderEntity savedOrder = orderRepository.save(order);
        paymentService.completeCashPaymentIfPending(savedOrder.getId());

        if (savedOrder.getUser() != null) {
            loyaltyService.awardPointsForPurchase(savedOrder.getUser().getId(), savedOrder.getId(), savedOrder.getTotalPrice());
        }

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
        emailService.sendOrderStatusUpdate(
                savedOrder,
                "Giao hàng thành công",
                "Đơn hàng của bạn đã được giao thành công bởi nhân viên giao hàng của AgriMarket. Cảm ơn quý khách đã tin dùng nông sản sạch của chúng tôi!"
        );

        return toOrderResponse(savedOrder, true);
    }

    @Override
    @Transactional
    public OrderResponse markFailedAttempt(Long deliveryStaffId, Long orderId, DeliveryFailureRequest request) {
        OrderEntity order = findAssignedOrderByIdForUpdate(orderId, deliveryStaffId);

        if (!STATUS_OUT_FOR_DELIVERY.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể cập nhật kết quả giao hàng cho đơn hàng đang trong quá trình giao");
        }

        String reason = request.getReason();
        String note = request.getNote();

        String nextStatus;
        String historyStatus;
        String notifyMessage;

        if ("canceled".equalsIgnoreCase(reason)) {
            nextStatus = "canceled";
            historyStatus = "canceled";
            order.setDeliveryFailureReason("Khách từ chối nhận/Hủy đơn");
            notifyMessage = "Đơn hàng #" + order.getId() + " đã bị hủy do khách từ chối nhận";
        } else if ("rescheduled".equalsIgnoreCase(reason)) {
            nextStatus = STATUS_READY_FOR_DELIVERY; // Reset về sẵn sàng giao để shipper giao lại
            historyStatus = "failed_delivery_attempt";
            order.setDeliveryFailureReason("Khách hẹn giao lại");
            notifyMessage = "Đơn hàng #" + order.getId() + " giao thất bại: Khách hẹn giao lại";
        } else if ("cannot_contact".equalsIgnoreCase(reason)) {
            nextStatus = STATUS_READY_FOR_DELIVERY;
            historyStatus = "failed_delivery_attempt";
            order.setDeliveryFailureReason("Không liên lạc được");
            notifyMessage = "Đơn hàng #" + order.getId() + " giao thất bại: Không liên lạc được với khách";
        } else {
            throw new BadRequestException("Lý do giao hàng thất bại không hợp lệ");
        }

        order.setStatus(nextStatus);
        OrderEntity savedOrder = orderRepository.save(order);

        if ("canceled".equals(nextStatus) && savedOrder.getUser() != null && savedOrder.getPointsUsed() != null && savedOrder.getPointsUsed() > 0) {
            loyaltyService.refundPointsForCancellation(savedOrder.getUser().getId(), savedOrder.getPointsUsed());
        }

        String historyNote = "Lý do: " + order.getDeliveryFailureReason();
        if (cleanBlank(note) != null) {
            historyNote += " | Ghi chú: " + note.trim();
        }

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                historyStatus,
                historyNote
        ));

        notifyCustomer(
                savedOrder,
                notifyMessage,
                buildOrderLink(savedOrder.getId())
        );
        emailService.sendOrderStatusUpdate(
                savedOrder,
                "Cập nhật kết quả giao hàng",
                notifyMessage + ". Chi tiết lý do: " + savedOrder.getDeliveryFailureReason() + 
                (cleanBlank(note) != null ? " | Ghi chú từ shipper: " + note.trim() : "")
        );

        return toOrderResponse(savedOrder, true);
    }

    @Override
    @Transactional
    public OrderResponse updateDeliveryStatus(Long deliveryStaffId, Long orderId, DeliveryStatusUpdateRequest request) {
        OrderEntity order = findAssignedOrderByIdForUpdate(orderId, deliveryStaffId);
        String currentStatus = cleanBlank(order.getStatus());
        String nextStatus = normalizeDeliveryStatus(request.getStatus());

        validateDeliveryTransition(currentStatus, nextStatus);

        String note = cleanBlank(request.getNote());
        if (STATUS_DELIVERED.equals(nextStatus)) {
            String proofImage = firstNonBlank(request.getProofImageUrl(), request.getProofImage());
            if (proofImage == null) {
                throw new BadRequestException("Vui lòng chụp hoặc chọn ảnh minh chứng giao hàng.");
            }
            order.setDeliveredAt(LocalDateTime.now());
            order.setDeliveryProofImage(proofImage);
            order.setDeliverySignature(cleanBlank(request.getSignature()));
            order.setDeliveryFailureReason(null);
        } else if (STATUS_FAILED_DELIVERY_ATTEMPT.equals(nextStatus)) {
            String failureReason = firstNonBlank(request.getFailureReason(), note);
            if (failureReason == null) {
                throw new BadRequestException("Vui lòng nhập lý do giao hàng thất bại.");
            }
            order.setDeliveryFailureReason(failureReason);
        } else if (STATUS_RETURNING.equals(nextStatus)) {
            String returnReason = firstNonBlank(request.getReturnReason(), note);
            if (returnReason == null) {
                throw new BadRequestException("Vui lòng nhập ghi chú hoàn hàng.");
            }
            order.setReturnReason(returnReason);
            order.setReturnNote(note == null ? returnReason : note);
            if (cleanBlank(order.getDeliveryFailureReason()) == null) {
                order.setDeliveryFailureReason(returnReason);
            }
            note = returnReason;
        } else if (STATUS_RETURNED.equals(nextStatus)) {
            String returnedNote = firstNonBlank(
                    request.getReturnNote(),
                    note,
                    "Đơn hàng đã hoàn về kho/người bán"
            );
            order.setReturnedAt(LocalDateTime.now());
            order.setReturnNote(returnedNote);
            note = returnedNote;
        }

        if (STATUS_PICKING_UP.equals(nextStatus) && order.getDispatchedAt() == null) {
            order.setDispatchedAt(LocalDateTime.now());
        }

        if (STATUS_OUT_FOR_DELIVERY.equals(nextStatus) && order.getDispatchedAt() == null) {
            order.setDispatchedAt(LocalDateTime.now());
        }

        order.setStatus(nextStatus);
        OrderEntity savedOrder = orderRepository.save(order);

        if (STATUS_DELIVERED.equals(nextStatus)) {
            paymentService.completeCashPaymentIfPending(savedOrder.getId());
            if (savedOrder.getUser() != null) {
                loyaltyService.awardPointsForPurchase(savedOrder.getUser().getId(), savedOrder.getId(), savedOrder.getTotalPrice());
            }
        }

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                nextStatus,
                buildDeliveryStatusHistoryNote(nextStatus, note, savedOrder.getDeliveryFailureReason())
        ));

        notifyCustomer(savedOrder, buildDeliveryStatusNotification(savedOrder, nextStatus), buildOrderLink(savedOrder.getId()));

        return toOrderResponse(savedOrder, true);
    }

    private void notifyCustomer(OrderEntity order, String message, String link) {
        if (order.getUser() == null) {
            return;
        }
        notificationService.createNotification(order.getUser().getId(), NOTIFICATION_TYPE_ORDER, message, link);
    }

    private void validateDeliveryTransition(String currentStatus, String nextStatus) {
        if (STATUS_DELIVERED.equals(currentStatus) || STATUS_COMPLETED.equals(currentStatus)) {
            throw new BadRequestException("Đơn hàng đã giao thành công, không thể cập nhật trạng thái.");
        }

        if (STATUS_RETURNED.equals(currentStatus)) {
            throw new BadRequestException("Đơn hàng đã hoàn hàng, không thể cập nhật trạng thái.");
        }

        Set<String> allowedNextStatuses = DELIVERY_STATUS_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowedNextStatuses.contains(nextStatus)) {
            throw new BadRequestException("Không thể cập nhật trạng thái giao hàng sai luồng.");
        }
    }

    private String normalizeDeliveryStatus(String status) {
        String normalized = cleanBlank(status);
        if (normalized == null) {
            throw new BadRequestException("Trạng thái giao hàng không được để trống");
        }

        normalized = normalized.toLowerCase(Locale.ROOT).replace('-', '_');
        return switch (normalized) {
            case "cho_lay_hang", "waiting_pickup", "ready_to_pick" -> STATUS_READY_FOR_DELIVERY;
            case "dang_lay_hang", "picking", "picking_up" -> STATUS_PICKING_UP;
            case "dang_giao", "delivering", "out_for_delivery" -> STATUS_OUT_FOR_DELIVERY;
            case "giao_thanh_cong", "delivered" -> STATUS_DELIVERED;
            case "giao_that_bai", "delivery_failed", "failed_delivery_attempt", "delivery_fail", "failed" -> STATUS_FAILED_DELIVERY_ATTEMPT;
            case "giao_lai", "cho_giao_lai", "redelivery_requested", "redelivery" -> STATUS_REDELIVERY_REQUESTED;
            case "hoan_hang", "returning", "return" -> STATUS_RETURNING;
            case "da_hoan_hang", "returned" -> STATUS_RETURNED;
            default -> throw new BadRequestException("Trạng thái giao hàng không hợp lệ.");
        };
    }

    private String buildDeliveryStatusHistoryNote(String status, String note, String failureReason) {
        String statusLabel = switch (status) {
            case STATUS_PICKING_UP -> "Đang lấy hàng";
            case STATUS_OUT_FOR_DELIVERY -> "Đang giao";
            case STATUS_DELIVERED -> "Giao thành công";
            case STATUS_FAILED_DELIVERY_ATTEMPT -> "Giao thất bại";
            case STATUS_REDELIVERY_REQUESTED -> "Chờ giao lại";
            case STATUS_RETURNING -> "Đang hoàn hàng";
            case STATUS_RETURNED -> "Đã hoàn hàng";
            default -> status;
        };

        List<String> parts = new ArrayList<>();
        parts.add("Cập nhật từ trang quản lý giao hàng: " + statusLabel);
        if (failureReason != null && STATUS_FAILED_DELIVERY_ATTEMPT.equals(status)) {
            parts.add("Lý do/Ghi chú: " + failureReason);
        }
        if (note != null && !note.equals(failureReason)) {
            parts.add("Ghi chú: " + note);
        }
        return String.join(" | ", parts);
    }

    private String buildDeliveryStatusNotification(OrderEntity order, String status) {
        return switch (status) {
            case STATUS_PICKING_UP -> "Đơn hàng #" + order.getId() + " đang được nhân viên lấy hàng";
            case STATUS_OUT_FOR_DELIVERY -> "Đơn hàng #" + order.getId() + " đang được giao";
            case STATUS_DELIVERED -> "Đơn hàng #" + order.getId() + " đã được giao thành công";
            case STATUS_FAILED_DELIVERY_ATTEMPT -> "Đơn hàng #" + order.getId() + " giao thất bại";
            case STATUS_REDELIVERY_REQUESTED -> "Đơn hàng #" + order.getId() + " đang chờ giao lại";
            case STATUS_RETURNING -> "Đơn hàng #" + order.getId() + " đang được hoàn hàng";
            case STATUS_RETURNED -> "Đơn hàng #" + order.getId() + " đã hoàn hàng";
            default -> "Đơn hàng #" + order.getId() + " đã được cập nhật trạng thái";
        };
    }

    private String buildOrderLink(Long orderId) {
        return "/orders/" + orderId;
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
            throw new BadRequestException("Trạng thái đơn giao hàng không hợp lệ.");
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

    private String firstNonBlank(String... values) {
        for (String value : values) {
            String cleanValue = cleanBlank(value);
            if (cleanValue != null) {
                return cleanValue;
            }
        }

        return null;
    }

    @Override
    @Transactional
    public void notifyArrival(Long deliveryStaffId, Long orderId) {
        OrderEntity order = findAssignedOrderById(orderId, deliveryStaffId);
        String message = "Đơn hàng #" + order.getId() + " đang chuẩn bị được giao tới bạn";
        notifyCustomer(order, message, buildOrderLink(order.getId()));
        
        emailService.sendOrderStatusUpdate(
                order,
                "Chuẩn bị giao hàng",
                "Nhân viên giao hàng của AgriMarket đang trên đường vận chuyển đơn hàng " 
                + (order.getTrackingNumber() != null ? order.getTrackingNumber() : "#" + order.getId()) 
                + " của bạn. Vui lòng chuẩn bị nhận hàng và giữ liên lạc điện thoại nhé!"
        );
    }
}
