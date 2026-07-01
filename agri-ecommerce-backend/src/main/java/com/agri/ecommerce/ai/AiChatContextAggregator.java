package com.agri.ecommerce.ai;

import com.agri.ecommerce.config.AiChatProperties;
import com.agri.ecommerce.dto.request.chat.AiChatRequest;
import com.agri.ecommerce.dto.response.chat.SuggestedProductResponse;
import com.agri.ecommerce.entity.CategoryEntity;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.entity.ProductEntity;
import com.agri.ecommerce.entity.ShippingAddressEntity;
import com.agri.ecommerce.repository.CategoryRepository;
import com.agri.ecommerce.repository.ContactRepository;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.repository.ProductRepository;
import com.agri.ecommerce.repository.ReviewRepository;
import com.agri.ecommerce.repository.ShippingAddressRepository;
import com.agri.ecommerce.service.AiProductContextService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatContextAggregator {

    private static final String PRODUCT_HIDDEN_STATUS = "discontinued";
    private static final String PRODUCT_IN_STOCK_STATUS = "in_stock";
    private static final List<String> DELIVERY_CONTEXT_STATUSES = List.of(
            "ready_for_delivery",
            "out_for_delivery",
            "delivered",
            "completed"
    );
    private static final List<String> ATTENTION_PAYMENT_STATUSES = List.of("pending", "failed");
    private static final NumberFormat MONEY_FORMAT = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final AiChatProperties properties;
    private final AiProductContextService productContextService;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CouponRepository couponRepository;
    private final ReviewRepository reviewRepository;
    private final ContactRepository contactRepository;
    private final ShippingAddressRepository shippingAddressRepository;

    @Transactional(readOnly = true)
    public AiChatContext build(AiChatRequest request, AiChatRole role, AiChatIntent intent, Long userId) {
        StringBuilder context = new StringBuilder(4096);
        appendCoreContext(context, request, role, intent, userId);

        List<SuggestedProductResponse> suggestedProducts = findSuggestedProducts(request, role, intent);
        appendProductContext(context, suggestedProducts, role, intent);
        appendRoleContext(context, role, intent, userId);

        return new AiChatContext(context.toString().trim(), suggestedProducts);
    }

    private List<SuggestedProductResponse> findSuggestedProducts(AiChatRequest request, AiChatRole role, AiChatIntent intent) {
        if (!shouldSuggestProducts(role, intent)) {
            return List.of();
        }

        try {
            return productContextService.findSuggestedProducts(request.getMessage());
        } catch (Exception exception) {
            log.warn("[AI Chat] Could not load product suggestions: {}", exception.getMessage());
            return List.of();
        }
    }

    private boolean shouldSuggestProducts(AiChatRole role, AiChatIntent intent) {
        if (role.canSeeAdminContext()) {
            return false;
        }

        return switch (intent) {
            case PRODUCT_SEARCH, PRODUCT_DETAIL_HELP, CATEGORY_SEARCH, CART_HELP, CHECKOUT_HELP, COUPON_SUPPORT -> true;
            default -> false;
        };
    }

    private void appendCoreContext(StringBuilder context, AiChatRequest request, AiChatRole role, AiChatIntent intent, Long userId) {
        appendLine(context, "BUSINESS_CONTEXT:");
        appendLine(context, "- AgriMarket is an agricultural e-commerce app for fresh produce, cart, checkout, COD/VNPay, delivery, admin operation.");
        appendLine(context, "- AI is read-only. It must not create, update, cancel, assign, refund, pay, delete, or modify any entity.");
        appendLine(context, "- If user asks for an action, guide them to the matching screen or API flow and ask them to confirm manually in UI.");
        appendLine(context, "- Order statuses: pending -> processing -> ready_for_delivery -> out_for_delivery -> delivered -> completed; canceled is terminal.");
        appendLine(context, "- Payment statuses: pending, completed, failed, refunded. VNPay is completed only after a valid return/IPN confirms payment.");
        appendLine(context, "- Address flow: province/city, district, ward, detail address, default address flag.");
        appendLine(context, "- Main customer screens: /, /products/[slug], /cart, /checkout, /checkout/vnpay-return, /profile.");
        appendLine(context, "- Main admin screens: /admin, /admin/products, /admin/categories, /admin/orders, /admin/coupons, /admin/contacts, /admin/reviews, /admin/delivery.");
        appendLine(context, "- Delivery screen: /delivery.");
        appendLine(context, "");
        appendLine(context, "REQUEST_CONTEXT:");
        appendLine(context, "- role=" + role);
        appendLine(context, "- authenticated=" + (userId != null));
        appendLine(context, "- intent=" + intent);
        appendLine(context, "- currentPath=" + blankToDefault(request.getCurrentPath(), "unknown"));
        appendLine(context, "- contextType=" + blankToDefault(request.getContextType(), "auto"));
        appendLine(context, "");
    }

    private void appendProductContext(
            StringBuilder context,
            List<SuggestedProductResponse> suggestedProducts,
            AiChatRole role,
            AiChatIntent intent
    ) {
        if (!shouldSuggestProducts(role, intent)) {
            return;
        }

        appendLine(context, "PRODUCT_SUGGESTIONS_FROM_DATABASE:");
        if (suggestedProducts.isEmpty()) {
            appendLine(context, "- No matching public products were found for this message.");
            appendLine(context, "");
            return;
        }

        suggestedProducts.forEach(product -> appendLine(
                context,
                "- #" + product.getId()
                        + " | " + safe(product.getName())
                        + " | category=" + safe(product.getCategoryName())
                        + " | price=" + formatMoney(product.getPrice())
                        + " | unit=" + safe(product.getUnit())
                        + " | stock=" + product.getStock()
                        + " | status=" + safe(product.getStatus())
                        + " | url=" + safe(product.getProductUrl())
        ));
        appendLine(context, "");
    }

    private void appendRoleContext(StringBuilder context, AiChatRole role, AiChatIntent intent, Long userId) {
        if (role.canSeeAdminContext()) {
            if (userId == null) {
                appendLine(context, "ADMIN_CONTEXT:");
                appendLine(context, "- Admin/staff metrics require a valid admin/staff JWT. Current request is not authenticated.");
                appendLine(context, "");
                return;
            }
            appendAdminContext(context);
            return;
        }

        if (role == AiChatRole.DELIVERY) {
            if (userId == null) {
                appendLine(context, "DELIVERY_CONTEXT:");
                appendLine(context, "- Delivery assignments require a valid delivery JWT. Current request is not authenticated.");
                appendLine(context, "");
                return;
            }
            appendDeliveryContext(context, userId);
            return;
        }

        if (userId != null || intent == AiChatIntent.ORDER_STATUS || intent == AiChatIntent.SHIPPING_ADDRESS_HELP) {
            appendCustomerContext(context, userId);
        }
    }

    private void appendCustomerContext(StringBuilder context, Long userId) {
        appendLine(context, "CUSTOMER_CONTEXT:");
        if (userId == null) {
            appendLine(context, "- Private order, payment, and address information require customer login.");
            appendLine(context, "");
            return;
        }

        try {
            shippingAddressRepository.findFirstByUser_IdAndDefaultAddressTrue(userId)
                    .ifPresent(address -> appendLine(context, "- Default address: " + formatAddress(address)));

            List<OrderEntity> orders = orderRepository.findByUser_Id(
                    userId,
                    PageRequest.of(
                            0,
                            safeLimit(properties.getMaxOrderContextRows(), 5),
                            Sort.by(Sort.Direction.DESC, "createdAt")
                    )
            ).getContent();
            Map<Long, PaymentEntity> paymentByOrderId = latestPaymentByOrderId(orders);

            if (orders.isEmpty()) {
                appendLine(context, "- No recent customer orders found.");
            } else {
                appendLine(context, "- Recent customer orders:");
                orders.forEach(order -> appendLine(context, formatOrderLine(order, paymentByOrderId.get(order.getId()))));
            }
        } catch (Exception exception) {
            log.warn("[AI Chat] Could not load customer context: {}", exception.getMessage());
            appendLine(context, "- Customer context is temporarily unavailable.");
        }
        appendLine(context, "");
    }

    private void appendDeliveryContext(StringBuilder context, Long deliveryStaffId) {
        appendLine(context, "DELIVERY_CONTEXT:");
        try {
            List<OrderEntity> orders = orderRepository.findAssignedDeliveryContextOrders(
                    deliveryStaffId,
                    DELIVERY_CONTEXT_STATUSES,
                    PageRequest.of(0, safeLimit(properties.getMaxDeliveryContextRows(), 7))
            );
            Map<Long, PaymentEntity> paymentByOrderId = latestPaymentByOrderId(orders);

            if (orders.isEmpty()) {
                appendLine(context, "- No assigned delivery orders found.");
            } else {
                appendLine(context, "- Assigned delivery orders:");
                orders.forEach(order -> appendLine(context, formatDeliveryOrderLine(order, paymentByOrderId.get(order.getId()))));
            }
        } catch (Exception exception) {
            log.warn("[AI Chat] Could not load delivery context: {}", exception.getMessage());
            appendLine(context, "- Delivery context is temporarily unavailable.");
        }
        appendLine(context, "");
    }

    private void appendAdminContext(StringBuilder context) {
        appendLine(context, "ADMIN_CONTEXT:");
        try {
            appendLine(context, "- Products active/visible: " + productRepository.countByStatusNot(PRODUCT_HIDDEN_STATUS));
            appendLine(context, "- Products in_stock: " + productRepository.countByStatus(PRODUCT_IN_STOCK_STATUS));
            appendLine(context, "- Products low stock (<=10): " + productRepository.countByStockLessThanEqualAndStatusNot(10, PRODUCT_HIDDEN_STATUS));
            appendLine(context, "- Categories: " + categoryRepository.count());
            appendLine(context, "- Active coupons: " + couponRepository.countByActiveTrue());
            appendLine(context, "- Available coupons now: " + couponRepository.countAvailableCoupons(LocalDateTime.now()));
            appendLine(context, "- Reviews: " + reviewRepository.count() + "; average rating=" + String.format(Locale.ROOT, "%.2f", reviewRepository.getAverageRating()));
            appendLine(context, "- Unreplied contacts: " + contactRepository.countByRepliedFalse());

            appendOrderStatusCounts(context, orderRepository.countOrdersByStatus());
            appendLowStockProducts(context);
            appendPendingOrders(context);
            appendAttentionPayments(context);
            appendCategories(context);
        } catch (Exception exception) {
            log.warn("[AI Chat] Could not load admin context: {}", exception.getMessage());
            appendLine(context, "- Admin context is temporarily unavailable.");
        }
        appendLine(context, "");
    }

    private void appendOrderStatusCounts(StringBuilder context, List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            appendLine(context, "- Order status counts: none.");
            return;
        }

        String statusSummary = rows.stream()
                .map(row -> safe(row[0]) + "=" + row[1])
                .collect(Collectors.joining(", "));
        appendLine(context, "- Order status counts: " + statusSummary);
    }

    private void appendLowStockProducts(StringBuilder context) {
        List<ProductEntity> products = productRepository.findByStockLessThanEqualAndStatusNotOrderByStockAscCreatedAtDesc(
                10,
                PRODUCT_HIDDEN_STATUS,
                PageRequest.of(0, safeLimit(properties.getMaxAdminContextRows(), 5))
        );

        if (products.isEmpty()) {
            appendLine(context, "- Low-stock products: none in top list.");
            return;
        }

        appendLine(context, "- Low-stock products:");
        products.forEach(product -> appendLine(
                context,
                "  + #" + product.getId()
                        + " | " + safe(product.getName())
                        + " | stock=" + product.getStock()
                        + " | status=" + safe(product.getStatus())
        ));
    }

    private void appendPendingOrders(StringBuilder context) {
        List<OrderEntity> orders = orderRepository.findByStatusOrderByCreatedAtDesc(
                "pending",
                PageRequest.of(0, safeLimit(properties.getMaxAdminContextRows(), 5))
        );
        Map<Long, PaymentEntity> paymentByOrderId = latestPaymentByOrderId(orders);

        if (orders.isEmpty()) {
            appendLine(context, "- Pending orders: none in top list.");
            return;
        }

        appendLine(context, "- Latest pending orders:");
        orders.forEach(order -> appendLine(context, formatOrderLine(order, paymentByOrderId.get(order.getId()))));
    }

    private void appendAttentionPayments(StringBuilder context) {
        List<PaymentEntity> payments = paymentRepository.findByStatusInOrderByCreatedAtDesc(
                ATTENTION_PAYMENT_STATUSES,
                PageRequest.of(0, safeLimit(properties.getMaxAdminContextRows(), 5))
        );

        if (payments.isEmpty()) {
            appendLine(context, "- Pending/failed payments: none in top list.");
            return;
        }

        appendLine(context, "- Pending/failed payments:");
        payments.forEach(payment -> appendLine(
                context,
                "  + payment#" + payment.getId()
                        + " | order#" + (payment.getOrder() == null ? "N/A" : payment.getOrder().getId())
                        + " | method=" + safe(payment.getPaymentMethod())
                        + " | status=" + safe(payment.getStatus())
                        + " | amount=" + formatMoney(payment.getAmount())
                        + " | created=" + formatDate(payment.getCreatedAt())
        ));
    }

    private void appendCategories(StringBuilder context) {
        List<CategoryEntity> categories = categoryRepository.findAllByOrderByIdAsc();
        if (categories.isEmpty()) {
            appendLine(context, "- Categories list is empty.");
            return;
        }

        String categorySummary = categories.stream()
                .limit(safeLimit(properties.getMaxAdminContextRows(), 5))
                .map(category -> "#" + category.getId() + " " + safe(category.getName()) + " (" + safe(category.getSlug()) + ")")
                .collect(Collectors.joining(", "));
        appendLine(context, "- Category samples: " + categorySummary);
    }

    private Map<Long, PaymentEntity> latestPaymentByOrderId(List<OrderEntity> orders) {
        if (orders == null || orders.isEmpty()) {
            return Map.of();
        }

        List<Long> orderIds = orders.stream().map(OrderEntity::getId).toList();
        return paymentRepository.findByOrder_IdInOrderByCreatedAtDesc(orderIds)
                .stream()
                .collect(Collectors.toMap(
                        payment -> payment.getOrder().getId(),
                        Function.identity(),
                        (latest, ignored) -> latest,
                        LinkedHashMap::new
                ));
    }

    private String formatOrderLine(OrderEntity order, PaymentEntity payment) {
        return "- order#" + order.getId()
                + " | customer=" + safe(order.getUser() == null ? null : order.getUser().getName())
                + " | orderStatus=" + safe(order.getStatus())
                + " | payment=" + formatPayment(payment)
                + " | total=" + formatMoney(order.getTotalPrice())
                + " | created=" + formatDate(order.getCreatedAt())
                + " | address=" + formatAddress(order.getShippingAddress());
    }

    private String formatDeliveryOrderLine(OrderEntity order, PaymentEntity payment) {
        return "- order#" + order.getId()
                + " | customer=" + safe(order.getUser() == null ? null : order.getUser().getName())
                + " | phone=" + safe(order.getShippingAddress() == null ? null : order.getShippingAddress().getPhone())
                + " | status=" + safe(order.getStatus())
                + " | payment=" + formatPayment(payment)
                + " | total=" + formatMoney(order.getTotalPrice())
                + " | address=" + formatAddress(order.getShippingAddress());
    }

    private String formatPayment(PaymentEntity payment) {
        if (payment == null) {
            return "none";
        }

        return safe(payment.getPaymentMethod()) + "/" + safe(payment.getStatus());
    }

    private String formatAddress(ShippingAddressEntity address) {
        if (address == null) {
            return "N/A";
        }

        return List.of(
                        safe(address.getFullName()),
                        safe(address.getPhone()),
                        safe(address.getAddress()),
                        safe(address.getCity())
                )
                .stream()
                .filter(value -> !"N/A".equals(value))
                .collect(Collectors.joining(", "));
    }

    private String formatMoney(BigDecimal value) {
        if (value == null) {
            return "0";
        }

        return MONEY_FORMAT.format(value);
    }

    private String formatDate(LocalDateTime value) {
        return value == null ? "N/A" : DATE_FORMAT.format(value);
    }

    private String safe(Object value) {
        if (value == null) {
            return "N/A";
        }

        String text = String.valueOf(value).trim();
        return text.isBlank() ? "N/A" : text;
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private int safeLimit(int value, int fallback) {
        if (value < 1) {
            return fallback;
        }

        return Math.min(value, 20);
    }

    private void appendLine(StringBuilder context, String value) {
        context.append(value).append('\n');
    }
}
