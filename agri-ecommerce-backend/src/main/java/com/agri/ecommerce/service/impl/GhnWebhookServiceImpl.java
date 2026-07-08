package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.webhook.GhnOrderStatusWebhookRequest;
import com.agri.ecommerce.dto.response.webhook.GhnWebhookResponse;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderStatusHistoryEntity;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.OrderStatusHistoryRepository;
import com.agri.ecommerce.service.EmailService;
import com.agri.ecommerce.service.GhnWebhookService;
import com.agri.ecommerce.service.NotificationService;
import com.agri.ecommerce.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class GhnWebhookServiceImpl implements GhnWebhookService {

    private static final String SHIPPING_PROVIDER_GHN = "GHN";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_PROCESSING = "processing";
    private static final String STATUS_READY_FOR_DELIVERY = "ready_for_delivery";
    private static final String STATUS_OUT_FOR_DELIVERY = "out_for_delivery";
    private static final String STATUS_DELIVERED = "delivered";
    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_CANCELED = "canceled";
    private static final String NOTIFICATION_TYPE_ORDER = "order";

    private static final Map<String, String> GHN_STATUS_LABELS = Map.ofEntries(
            Map.entry("ready_to_pick", "Chờ lấy hàng"),
            Map.entry("picking", "GHN đang đến lấy hàng"),
            Map.entry("cancel", "Đơn GHN đã hủy"),
            Map.entry("money_collect_picking", "GHN đang làm việc với người gửi"),
            Map.entry("picked", "GHN đã lấy hàng"),
            Map.entry("storing", "Hàng đang ở kho phân loại GHN"),
            Map.entry("transporting", "GHN đang trung chuyển"),
            Map.entry("sorting", "GHN đang phân loại"),
            Map.entry("delivering", "GHN đang giao hàng"),
            Map.entry("money_collect_delivering", "GHN đang thu tiền khi giao"),
            Map.entry("delivered", "GHN giao hàng thành công"),
            Map.entry("delivery_fail", "GHN giao hàng thất bại"),
            Map.entry("waiting_to_return", "GHN chờ xử lý giao lại hoặc hoàn hàng"),
            Map.entry("return", "GHN chờ hoàn hàng"),
            Map.entry("return_transporting", "GHN đang trung chuyển hoàn hàng"),
            Map.entry("return_sorting", "GHN đang phân loại hoàn hàng"),
            Map.entry("returning", "GHN đang hoàn hàng về shop"),
            Map.entry("return_fail", "GHN hoàn hàng thất bại"),
            Map.entry("returned", "GHN đã hoàn hàng về shop"),
            Map.entry("exception", "GHN ghi nhận ngoại lệ"),
            Map.entry("damage", "GHN báo hàng hư hỏng"),
            Map.entry("lost", "GHN báo thất lạc hàng")
    );

    private static final Set<String> GHN_IN_TRANSIT_STATUSES = Set.of(
            "picked",
            "storing",
            "transporting",
            "sorting",
            "delivering",
            "money_collect_delivering"
    );

    private static final Set<String> GHN_CANCELED_STATUSES = Set.of(
            "cancel",
            "return",
            "return_transporting",
            "return_sorting",
            "returning",
            "return_fail",
            "returned",
            "damage",
            "lost"
    );

    private static final Map<String, Integer> INTERNAL_STATUS_RANK = Map.of(
            STATUS_PENDING, 0,
            STATUS_PROCESSING, 1,
            STATUS_READY_FOR_DELIVERY, 2,
            STATUS_OUT_FOR_DELIVERY, 3,
            STATUS_DELIVERED, 4,
            STATUS_COMPLETED, 5
    );

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final NotificationService notificationService;
    private final PaymentService paymentService;
    private final EmailService emailService;

    @Override
    @Transactional
    public GhnWebhookResponse handleOrderStatus(GhnOrderStatusWebhookRequest request) {
        String orderCode = cleanBlank(request.getOrderCode());
        String ghnStatus = normalizeStatus(request.getStatus());

        Optional<OrderEntity> maybeOrder = orderRepository.findByTrackingNumberForUpdate(orderCode);
        if (maybeOrder.isEmpty()) {
            log.warn("[GHN Webhook] Ignored status '{}' because tracking number '{}' was not found", ghnStatus, orderCode);
            return GhnWebhookResponse.builder()
                    .processed(false)
                    .ignored(true)
                    .orderCode(orderCode)
                    .ghnStatus(ghnStatus)
                    .message("No AgriMarket order found for GHN order code")
                    .build();
        }

        OrderEntity order = maybeOrder.get();
        String previousShippingStatus = cleanBlank(order.getShippingStatus());
        String previousInternalStatus = cleanBlank(order.getStatus());
        String targetInternalStatus = resolveTargetInternalStatus(ghnStatus);
        String nextInternalStatus = resolveNextInternalStatus(previousInternalStatus, targetInternalStatus);
        boolean shippingStatusChanged = !sameText(previousShippingStatus, ghnStatus);
        boolean internalStatusChanged = !sameText(previousInternalStatus, nextInternalStatus);

        if (!shippingStatusChanged && !internalStatusChanged) {
            log.info("[GHN Webhook] Duplicate status '{}' for order #{} ({})", ghnStatus, order.getId(), orderCode);
            return buildResponse(order, orderCode, ghnStatus, true, "Duplicate GHN status ignored");
        }

        order.setShippingProvider(SHIPPING_PROVIDER_GHN);
        order.setShippingStatus(ghnStatus);
        order.setShippingStatusUpdatedAt(LocalDateTime.now());

        if (internalStatusChanged) {
            order.setStatus(nextInternalStatus);
            applyInternalStatusSideEffects(order, nextInternalStatus);
        }

        OrderEntity savedOrder = orderRepository.save(order);
        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                internalStatusChanged ? nextInternalStatus : previousInternalStatus,
                buildHistoryNote(request, previousShippingStatus, previousInternalStatus, nextInternalStatus, internalStatusChanged)
        ));

        if (internalStatusChanged) {
            notifyCustomer(savedOrder, nextInternalStatus, ghnStatus);
        }

        return buildResponse(savedOrder, orderCode, ghnStatus, false, "GHN status synchronized");
    }

    private String resolveTargetInternalStatus(String ghnStatus) {
        if (GHN_IN_TRANSIT_STATUSES.contains(ghnStatus)) {
            return STATUS_OUT_FOR_DELIVERY;
        }

        if ("delivered".equals(ghnStatus)) {
            return STATUS_DELIVERED;
        }

        if (GHN_CANCELED_STATUSES.contains(ghnStatus)) {
            return STATUS_CANCELED;
        }

        return null;
    }

    private String resolveNextInternalStatus(String currentStatus, String targetStatus) {
        if (targetStatus == null || currentStatus == null) {
            return currentStatus;
        }

        if (STATUS_COMPLETED.equals(currentStatus)) {
            return currentStatus;
        }

        if (STATUS_CANCELED.equals(currentStatus)) {
            return currentStatus;
        }

        if (STATUS_CANCELED.equals(targetStatus)) {
            return STATUS_DELIVERED.equals(currentStatus) ? currentStatus : targetStatus;
        }

        int currentRank = INTERNAL_STATUS_RANK.getOrDefault(currentStatus, 0);
        int targetRank = INTERNAL_STATUS_RANK.getOrDefault(targetStatus, currentRank);
        return targetRank < currentRank ? currentStatus : targetStatus;
    }

    private void applyInternalStatusSideEffects(OrderEntity order, String nextInternalStatus) {
        if (STATUS_OUT_FOR_DELIVERY.equals(nextInternalStatus) && order.getDispatchedAt() == null) {
            order.setDispatchedAt(LocalDateTime.now());
        }

        if (STATUS_DELIVERED.equals(nextInternalStatus)) {
            if (order.getDeliveredAt() == null) {
                order.setDeliveredAt(LocalDateTime.now());
            }
            paymentService.completeCashPaymentIfPending(order.getId());
        }
    }

    private OrderStatusHistoryEntity createStatusHistory(OrderEntity order, String status, String note) {
        return OrderStatusHistoryEntity.builder()
                .order(order)
                .status(status)
                .changedAt(LocalDateTime.now())
                .note(note)
                .build();
    }

    private void notifyCustomer(OrderEntity order, String internalStatus, String ghnStatus) {
        String message = buildNotificationMessage(order.getId(), internalStatus, ghnStatus);
        notificationService.createNotification(order.getUser().getId(), NOTIFICATION_TYPE_ORDER, message, "/orders/" + order.getId());

        if (STATUS_OUT_FOR_DELIVERY.equals(internalStatus)
                || STATUS_DELIVERED.equals(internalStatus)
                || STATUS_CANCELED.equals(internalStatus)) {
            emailService.sendOrderStatusUpdate(order, buildEmailTitle(internalStatus), message);
        }
    }

    private String buildNotificationMessage(Long orderId, String internalStatus, String ghnStatus) {
        String label = getGhnStatusLabel(ghnStatus);

        if (STATUS_OUT_FOR_DELIVERY.equals(internalStatus)) {
            return "Đơn hàng #" + orderId + " đang được GHN vận chuyển. Trạng thái GHN: " + label + ".";
        }

        if (STATUS_DELIVERED.equals(internalStatus)) {
            return "Đơn hàng #" + orderId + " đã được GHN giao thành công.";
        }

        if (STATUS_CANCELED.equals(internalStatus)) {
            return "Đơn hàng #" + orderId + " được GHN cập nhật không thể tiếp tục giao. Trạng thái GHN: " + label + ".";
        }

        return "Đơn hàng #" + orderId + " có cập nhật mới từ GHN: " + label + ".";
    }

    private String buildEmailTitle(String internalStatus) {
        if (STATUS_OUT_FOR_DELIVERY.equals(internalStatus)) {
            return "GHN đang giao hàng";
        }

        if (STATUS_DELIVERED.equals(internalStatus)) {
            return "GHN giao hàng thành công";
        }

        if (STATUS_CANCELED.equals(internalStatus)) {
            return "GHN cập nhật đơn không thể giao";
        }

        return "Cập nhật trạng thái GHN";
    }

    private String buildHistoryNote(
            GhnOrderStatusWebhookRequest request,
            String previousShippingStatus,
            String previousInternalStatus,
            String nextInternalStatus,
            boolean internalStatusChanged
    ) {
        String ghnStatus = normalizeStatus(request.getStatus());
        StringBuilder note = new StringBuilder("GHN webhook: ")
                .append(getGhnStatusLabel(ghnStatus))
                .append(" (")
                .append(ghnStatus)
                .append(").");

        appendNotePart(note, "Loại event", cleanBlank(request.getType()));
        appendNotePart(note, "Thời gian GHN", cleanBlank(request.getTime()));
        appendNotePart(note, "Mô tả", cleanBlank(request.getDescription()));
        appendNotePart(note, "Lý do", cleanBlank(request.getReason()));
        appendNotePart(note, "Mã lý do", cleanBlank(request.getReasonCode()));

        if (previousShippingStatus != null) {
            appendNotePart(note, "GHN trước đó", previousShippingStatus);
        }

        if (internalStatusChanged) {
            note.append(" Trạng thái nội bộ: ")
                    .append(previousInternalStatus)
                    .append(" -> ")
                    .append(nextInternalStatus)
                    .append(".");
        } else {
            note.append(" Trạng thái nội bộ giữ nguyên: ")
                    .append(previousInternalStatus)
                    .append(".");
        }

        return note.toString();
    }

    private void appendNotePart(StringBuilder note, String label, String value) {
        if (value != null) {
            note.append(" ").append(label).append(": ").append(value).append(".");
        }
    }

    private GhnWebhookResponse buildResponse(
            OrderEntity order,
            String orderCode,
            String ghnStatus,
            boolean ignored,
            String message
    ) {
        return GhnWebhookResponse.builder()
                .processed(!ignored)
                .ignored(ignored)
                .orderId(order.getId())
                .orderCode(orderCode)
                .ghnStatus(ghnStatus)
                .internalStatus(order.getStatus())
                .message(message)
                .build();
    }

    private String getGhnStatusLabel(String ghnStatus) {
        return GHN_STATUS_LABELS.getOrDefault(ghnStatus, ghnStatus);
    }

    private String normalizeStatus(String status) {
        String cleanStatus = cleanBlank(status);
        return cleanStatus == null ? "" : cleanStatus.toLowerCase(Locale.ROOT);
    }

    private boolean sameText(String left, String right) {
        return cleanBlank(left) != null && cleanBlank(left).equals(cleanBlank(right));
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }
}
