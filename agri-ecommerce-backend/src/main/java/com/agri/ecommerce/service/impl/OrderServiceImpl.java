package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewItemResponse;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.config.VnpayProperties;
import com.agri.ecommerce.entity.*;
import com.agri.ecommerce.common.exception.BadRequestException;
import com.agri.ecommerce.common.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.mapper.ShippingAddressMapper;
import com.agri.ecommerce.repository.*;
import com.agri.ecommerce.service.NotificationService;
import com.agri.ecommerce.service.OrderService;
import com.agri.ecommerce.service.PaymentService;
import com.agri.ecommerce.service.ShippingCarrierService;
import com.agri.ecommerce.service.EmailService;
import com.agri.ecommerce.service.LoyaltyService;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String OUT_OF_STOCK_STATUS = "out_of_stock";
    private static final String ORDER_PENDING = "pending";
    private static final String ORDER_DELIVERED = "delivered";
    private static final String ORDER_COMPLETED = "completed";
    private static final String ORDER_CANCELED = "canceled";
    private static final String NOTIFICATION_TYPE_ORDER = "order";
    private static final String PAYMENT_PENDING = "pending";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String PAYMENT_FAILED = "failed";
    private static final String COUPON_TYPE_ORDER_DISCOUNT = "ORDER_DISCOUNT";
    private static final String COUPON_TYPE_FREESHIP = "FREESHIP";
    private static final String COUPON_TYPE_PRODUCT_DISCOUNT = "PRODUCT_DISCOUNT";
    private static final String DISCOUNT_TYPE_FIXED_AMOUNT = "FIXED_AMOUNT";
    private static final String PAYMENT_METHOD_VNPAY = "vnpay";
    private static final String SHIPPING_PROVIDER_GHN = "GHN";
    private static final BigDecimal DEFAULT_SHIPPING_FEE = new BigDecimal("25000.00");
    private static final double DEFAULT_ITEM_WEIGHT_GRAMS = 500.0d;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_PAYMENT_METHODS = Set.of("cash", "paypal", "vnpay");
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "subtotal", "discountAmount", "shippingFee", "totalPrice", "status", "createdAt", "updatedAt"
    );

    private final OrderRepository orderRepository;

    private final OrderItemRepository orderItemRepository;

    private final OrderStatusHistoryRepository orderStatusHistoryRepository;

    private final PaymentRepository paymentRepository;

    private final ShippingAddressRepository shippingAddressRepository;

    private final CouponRepository couponRepository;

    private final CartItemRepository cartItemRepository;

    private final ProductRepository productRepository;

    private final UserRepository userRepository;

    private final InventoryBatchRepository inventoryBatchRepository;

    private final InventoryTransactionRepository inventoryTransactionRepository;

    private final NotificationService notificationService;

    private final PaymentService paymentService;

    private final OrderMapper orderMapper;

    private final ShippingAddressMapper shippingAddressMapper;

    private final ShippingCarrierService shippingCarrierService;

    private final VnpayProperties vnpayProperties;

    private final LoyaltyService loyaltyService;

    @Autowired
    private EmailService emailService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getOrders(Long userId, int page, int size, String sort) {
        validatePaging(page, size);

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<OrderEntity> orderPage = orderRepository.findByUser_Id(userId, pageable);
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
    public OrderResponse getOrder(Long userId, Long orderId) {
        OrderEntity order = findOrderByIdAndUserId(orderId, userId);
        return toOrderResponse(order, true);
    }

    @Override
    @Transactional(readOnly = true)
    public CheckoutPreviewResponse previewCheckout(Long userId, CheckoutRequest request) {
        UserEntity user = findUserById(userId);
        ShippingAddressEntity shippingAddress = findShippingAddressByIdAndUserId(request.getShippingAddressId(), userId);
        String paymentMethod = normalizePaymentMethod(request.getPaymentMethod());
        List<CartItemEntity> cartItems = cartItemRepository.findByUser_IdOrderByCreatedAtDesc(userId);

        if (cartItems.isEmpty()) {
            return CheckoutPreviewResponse.builder()
                    .canCheckout(false)
                    .paymentMethod(paymentMethod)
                    .couponCode(cleanBlank(request.getCouponCode()))
                    .couponValid(false)
                    .couponMessage("Cart is empty")
                    .shippingAddress(shippingAddressMapper.toShippingAddressResponse(shippingAddress))
                    .totalQuantity(0)
                    .subtotal(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .discountAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .couponDiscountAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .pointsDiscount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .pointsUsed(0)
                    .shippingFee(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .totalPrice(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .items(List.of())
                    .warnings(List.of("Cart is empty"))
                    .build();
        }

        Map<Long, Integer> quantityByProductId = aggregateCartQuantities(cartItems);
        Map<Long, ProductEntity> productsById = cartItems.stream()
                .map(CartItemEntity::getProduct)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(ProductEntity::getId, Function.identity(), (first, ignored) -> first));
        List<CheckoutPreviewItemResponse> previewItems = quantityByProductId.entrySet().stream()
                .map(entry -> toCheckoutPreviewItem(productsById.get(entry.getKey()), entry.getValue()))
                .toList();
        boolean allItemsAvailable = previewItems.stream().allMatch(CheckoutPreviewItemResponse::isAvailable);
        int totalQuantity = previewItems.stream()
                .mapToInt(item -> item.getRequestedQuantity() == null ? 0 : item.getRequestedQuantity())
                .sum();
        BigDecimal subtotal = previewItems.stream()
                .map(CheckoutPreviewItemResponse::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        List<CheckoutItem> checkoutItems = quantityByProductId.entrySet().stream()
                .map(entry -> {
                    ProductEntity product = productsById.get(entry.getKey());
                    BigDecimal price = product == null || product.getPrice() == null ? BigDecimal.ZERO : product.getPrice();
                    BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(entry.getValue()));
                    return new CheckoutItem(product, entry.getValue(), price, lineTotal);
                })
                .toList();
        BigDecimal baseShippingFee = calculateBaseShippingFee(shippingAddress, totalQuantity);
        if (subtotal.compareTo(new BigDecimal("100000.00")) >= 0) {
            baseShippingFee = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        CouponPreviewCalculation couponCalculation = calculateCouponPreview(request.getCouponCode(), subtotal, baseShippingFee, checkoutItems, user);

        int pointsToRedeem = calculateRedeemablePoints(request, user, subtotal);
        BigDecimal pointsDiscount = pointsToMoney(pointsToRedeem);

        BigDecimal totalPrice = subtotal
                .subtract(couponCalculation.discountAmount())
                .subtract(pointsDiscount)
                .add(couponCalculation.shippingFee())
                .setScale(2, RoundingMode.HALF_UP);
        if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
            totalPrice = BigDecimal.ZERO;
        }

        List<String> warnings = buildCheckoutPreviewWarnings(previewItems, couponCalculation);
        if (subtotal.compareTo(new BigDecimal("100000.00")) >= 0) {
            warnings = new ArrayList<>(warnings);
            warnings.add("Đơn hàng từ 100.000đ được miễn phí vận chuyển!");
        }
        if (pointsDiscount.compareTo(BigDecimal.ZERO) > 0) {
            warnings = new ArrayList<>(warnings);
            warnings.add("Đã áp dụng giảm giá " + pointsToRedeem + " xu tích lũy");
        }

        return CheckoutPreviewResponse.builder()
                .canCheckout(allItemsAvailable && couponCalculation.checkoutAllowed())
                .paymentMethod(paymentMethod)
                .couponCode(couponCalculation.couponCode())
                .couponValid(couponCalculation.valid())
                .couponMessage(couponCalculation.message())
                .shippingAddress(shippingAddressMapper.toShippingAddressResponse(shippingAddress))
                .totalQuantity(totalQuantity)
                .subtotal(subtotal)
                .discountAmount(couponCalculation.discountAmount().add(pointsDiscount))
                .couponDiscountAmount(couponCalculation.discountAmount())
                .pointsDiscount(pointsDiscount)
                .pointsUsed(pointsToRedeem)
                .shippingFee(couponCalculation.shippingFee())
                .totalPrice(totalPrice)
                .items(previewItems)
                .warnings(warnings)
                .build();
    }

    @Override
    @Transactional
    public OrderResponse checkout(Long userId, CheckoutRequest request) {
        UserEntity user = findUserById(userId);
        ShippingAddressEntity shippingAddress = findShippingAddressByIdAndUserId(request.getShippingAddressId(), userId);
        String paymentMethod = normalizePaymentMethod(request.getPaymentMethod());
        validateVnpayConfigurationIfNeeded(paymentMethod);
        List<CartItemEntity> cartItems = cartItemRepository.findByUser_IdOrderByCreatedAtDesc(userId);

        if (cartItems.isEmpty()) {
            throw new BadRequestException("Giỏ hàng đang trống, không thể đặt hàng");
        }

        Map<Long, Integer> quantityByProductId = aggregateCartQuantities(cartItems);
        List<ProductEntity> lockedProducts = productRepository.findAllByIdInForUpdate(quantityByProductId.keySet());
        Map<Long, ProductEntity> productsById = lockedProducts.stream()
                .collect(Collectors.toMap(ProductEntity::getId, Function.identity()));
        List<CheckoutItem> checkoutItems = buildCheckoutItems(quantityByProductId, productsById);
        BigDecimal subtotal = checkoutItems.stream()
                .map(CheckoutItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalQuantity = checkoutItems.stream().mapToInt(CheckoutItem::quantity).sum();
        BigDecimal baseShippingFee = calculateBaseShippingFee(shippingAddress, totalQuantity);
        if (subtotal.compareTo(new BigDecimal("100000.00")) >= 0) {
            baseShippingFee = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        CouponCalculation couponCalculation = calculateCoupon(request.getCouponCode(), subtotal, baseShippingFee, checkoutItems, user);
        int pointsToRedeem = calculateRedeemablePoints(request, user, subtotal);
        int pointsUsed = pointsToRedeem > 0
                ? loyaltyService.deductPointsForCheckout(userId, pointsToRedeem)
                : 0;
        BigDecimal pointsDiscount = pointsToMoney(pointsUsed);
        BigDecimal totalPrice = subtotal
                .subtract(couponCalculation.discountAmount())
                .subtract(pointsDiscount)
                .add(couponCalculation.shippingFee())
                .setScale(2, RoundingMode.HALF_UP);
        if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
            totalPrice = BigDecimal.ZERO;
        }

        OrderEntity order = orderRepository.save(OrderEntity.builder()
                .user(user)
                .shippingAddress(shippingAddress)
                .shippingName(shippingAddress.getFullName())
                .shippingPhone(shippingAddress.getPhone())
                .shippingAddressDetail(shippingAddress.getAddress())
                .shippingCity(shippingAddress.getCity())
                .subtotal(subtotal)
                .discountAmount(couponCalculation.discountAmount().add(pointsDiscount))
                .shippingFee(couponCalculation.shippingFee())
                .coupon(couponCalculation.coupon())
                .couponCode(couponCalculation.couponCode())
                .totalPrice(totalPrice)
                .status(ORDER_PENDING)
                .pointsUsed(pointsUsed)
                .pointsEarned(0)
                .build());

        List<OrderItemEntity> orderItems = checkoutItems.stream()
                .map(checkoutItem -> OrderItemEntity.builder()
                        .order(order)
                        .product(checkoutItem.product())
                        .quantity(checkoutItem.quantity())
                        .price(checkoutItem.price())
                        .build())
                .toList();
        List<OrderItemEntity> savedOrderItems = orderItemRepository.saveAll(orderItems);

        PaymentEntity payment = paymentRepository.save(PaymentEntity.builder()
                .order(order)
                .paymentMethod(paymentMethod)
                .amount(totalPrice)
                .status(PAYMENT_PENDING)
                .build());

        String orderNote = "Customer created order";
        if ("cash".equalsIgnoreCase(paymentMethod)) {
            try {
                String trackingCode = shippingCarrierService.createShippingLabel(order);
                order.setTrackingNumber(trackingCode);
                order.setShippingProvider(SHIPPING_PROVIDER_GHN);
                orderRepository.save(order);
                orderNote += ". Đã tạo vận đơn trên GHN. Mã vận đơn: " + trackingCode;
            } catch (Exception ex) {
                log.error("[Order Service] Failed to create GHN shipping label: {}", ex.getMessage());
            }
        }

        OrderStatusHistoryEntity history = orderStatusHistoryRepository.save(createStatusHistory(
                order,
                ORDER_PENDING,
                orderNote
        ));

        checkoutItems.forEach(this::decreaseProductStock);
        productRepository.saveAll(checkoutItems.stream().map(CheckoutItem::product).toList());
        cartItemRepository.deleteByUser_Id(userId);
        notifyUser(
                userId,
                "Đơn hàng #" + order.getId() + " đã được tạo thành công",
                buildOrderLink(order.getId())
        );

        if ("cash".equalsIgnoreCase(paymentMethod)) {
            if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            try {
                                emailService.sendOrderInvoice(order);
                            } catch (Exception ex) {
                                log.error("[Order Service] Failed to send COD email after commit: {}", ex.getMessage());
                            }
                        }
                    }
                );
            } else {
                try {
                    emailService.sendOrderInvoice(order);
                } catch (Exception ex) {
                    log.error("[Order Service] Failed to send COD email: {}", ex.getMessage());
                }
            }
        }

        return orderMapper.toOrderResponse(order, savedOrderItems, payment, List.of(history));
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long userId, Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findOrderByIdAndUserIdForUpdate(orderId, userId);

        if (!ORDER_PENDING.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể hủy đơn hàng đang chờ xử lý");
        }

        PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(orderId).orElse(null);
        if (payment != null && PAYMENT_COMPLETED.equals(payment.getStatus())) {
            throw new BadRequestException("Đơn hàng đã thanh toán, vui lòng liên hệ cửa hàng để được hỗ trợ hủy");
        }

        List<OrderItemEntity> orderItems = orderItemRepository.findByOrder_IdOrderByIdAsc(orderId);
        restoreProductStock(orderItems);
        releaseCouponUsage(order);

        order.setStatus(ORDER_CANCELED);
        OrderEntity savedOrder = orderRepository.save(order);

        if (savedOrder.getPointsUsed() != null && savedOrder.getPointsUsed() > 0) {
            loyaltyService.refundPointsForCancellation(userId, savedOrder.getPointsUsed());
        }

        if (payment != null && PAYMENT_PENDING.equals(payment.getStatus())) {
            payment.setStatus(PAYMENT_FAILED);
            paymentRepository.save(payment);
        }

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                ORDER_CANCELED,
                cleanBlank(request == null ? null : request.getNote())
        ));
        notifyUser(
                userId,
                "Đơn hàng #" + savedOrder.getId() + " đã được hủy thành công",
                buildOrderLink(savedOrder.getId())
        );

        return toOrderResponse(savedOrder, true);
    }

    @Override
    @Transactional
    public OrderResponse completeOrder(Long userId, Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findOrderByIdAndUserIdForUpdate(orderId, userId);

        if (!ORDER_DELIVERED.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận hoàn tất đơn hàng đã giao");
        }

        order.setStatus(ORDER_COMPLETED);
        OrderEntity savedOrder = orderRepository.save(order);

        loyaltyService.awardPointsForPurchase(userId, orderId, savedOrder.getTotalPrice());

        paymentService.completeCashPaymentIfPending(orderId);

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                ORDER_COMPLETED,
                cleanBlank(request == null ? null : request.getNote())
        ));
        notifyUser(
                userId,
                "Đơn hàng #" + savedOrder.getId() + " đã hoàn tất",
                buildOrderLink(savedOrder.getId())
        );

        return toOrderResponse(savedOrder, true);
    }

    private void notifyUser(Long userId, String message, String link) {
        notificationService.createNotification(userId, NOTIFICATION_TYPE_ORDER, message, link);
    }

    private String buildOrderLink(Long orderId) {
        return "/orders/" + orderId;
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

    private CheckoutPreviewItemResponse toCheckoutPreviewItem(ProductEntity product, Integer requestedQuantity) {
        if (product == null) {
            return CheckoutPreviewItemResponse.builder()
                    .requestedQuantity(requestedQuantity)
                    .availableStock(0)
                    .price(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .lineTotal(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .available(false)
                    .message("Product was not found")
                    .build();
        }

        int safeRequestedQuantity = requestedQuantity == null ? 0 : requestedQuantity;
        int availableStock = product.getStock() == null ? 0 : product.getStock();
        BigDecimal price = product.getPrice() == null ? BigDecimal.ZERO : product.getPrice();
        BigDecimal lineTotal = price
                .multiply(BigDecimal.valueOf(Math.max(safeRequestedQuantity, 0)))
                .setScale(2, RoundingMode.HALF_UP);
        String message = getCheckoutPreviewItemMessage(product, safeRequestedQuantity, availableStock);

        return CheckoutPreviewItemResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .productNameEn(product.getNameEn())
                .productSlug(product.getSlug())
                .unit(product.getUnit())
                .unitEn(product.getUnitEn())
                .requestedQuantity(safeRequestedQuantity)
                .availableStock(availableStock)
                .status(product.getStatus())
                .price(price)
                .lineTotal(lineTotal)
                .available(message == null)
                .message(message == null ? "Available" : message)
                .build();
    }

    private String getCheckoutPreviewItemMessage(ProductEntity product, int requestedQuantity, int availableStock) {
        if (requestedQuantity <= 0) {
            return "Requested quantity is invalid";
        }

        if (!IN_STOCK_STATUS.equals(product.getStatus())) {
            return "Product is not available for sale";
        }

        if (availableStock <= 0) {
            return "Product is out of stock";
        }

        if (requestedQuantity > availableStock) {
            return "Requested quantity exceeds current stock: " + availableStock;
        }

        return null;
    }

    private Map<Long, Integer> aggregateCartQuantities(List<CartItemEntity> cartItems) {
        Map<Long, Integer> quantityByProductId = new LinkedHashMap<>();

        for (CartItemEntity cartItem : cartItems) {
            Long productId = cartItem.getProduct().getId();
            Integer quantity = cartItem.getQuantity();

            if (quantity == null || quantity <= 0) {
                throw new BadRequestException("Giỏ hàng có sản phẩm với số lượng không hợp lệ");
            }

            quantityByProductId.merge(productId, quantity, Integer::sum);
        }

        return quantityByProductId;
    }

    private List<CheckoutItem> buildCheckoutItems(Map<Long, Integer> quantityByProductId, Map<Long, ProductEntity> productsById) {
        List<CheckoutItem> checkoutItems = new ArrayList<>();

        for (Map.Entry<Long, Integer> entry : quantityByProductId.entrySet()) {
            ProductEntity product = productsById.get(entry.getKey());

            if (product == null) {
                throw new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + entry.getKey());
            }

            validateProductForCheckout(product, entry.getValue());
            BigDecimal price = product.getPrice();
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(entry.getValue())).setScale(2, RoundingMode.HALF_UP);
            checkoutItems.add(new CheckoutItem(product, entry.getValue(), price, lineTotal));
        }

        return checkoutItems;
    }

    private void validateProductForCheckout(ProductEntity product, int requestedQuantity) {
        if (!IN_STOCK_STATUS.equals(product.getStatus())) {
            throw new BadRequestException("Sản phẩm hiện không còn bán: " + product.getName());
        }

        if (product.getStock() == null || product.getStock() <= 0) {
            throw new BadRequestException("Sản phẩm đã hết hàng: " + product.getName());
        }

        if (requestedQuantity > product.getStock()) {
            throw new BadRequestException("Số lượng đặt hàng của " + product.getName() + " vượt quá tồn kho hiện tại: " + product.getStock());
        }
    }

    private void decreaseProductStock(CheckoutItem checkoutItem) {
        ProductEntity product = checkoutItem.product();
        int requestedQty = checkoutItem.quantity();

        List<InventoryBatchEntity> availableBatches = inventoryBatchRepository.findAvailableBatchesFifo(product.getId(), LocalDateTime.now());

        int quantityNeeded = requestedQty;
        for (InventoryBatchEntity batch : availableBatches) {
            if (quantityNeeded <= 0) break;

            int batchRemaining = batch.getRemainingQuantity();
            int deduct = Math.min(batchRemaining, quantityNeeded);

            batch.setRemainingQuantity(batchRemaining - deduct);
            inventoryBatchRepository.save(batch);

            inventoryTransactionRepository.save(InventoryTransactionEntity.builder()
                    .product(product)
                    .batch(batch)
                    .quantity(-deduct)
                    .type("EXPORT_SALE")
                    .note("Xuất bán cho Đơn hàng")
                    .build());

            quantityNeeded -= deduct;
        }

        int remainingStock = product.getStock() - requestedQty;
        product.setStock(remainingStock);

        if (remainingStock == 0 && IN_STOCK_STATUS.equals(product.getStatus())) {
            product.setStatus(OUT_OF_STOCK_STATUS);
        }
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

            List<InventoryBatchEntity> availableBatches = inventoryBatchRepository.findAvailableBatchesFifo(product.getId(), LocalDateTime.now());
            if (!availableBatches.isEmpty()) {
                InventoryBatchEntity latestBatch = availableBatches.get(availableBatches.size() - 1);
                latestBatch.setRemainingQuantity(latestBatch.getRemainingQuantity() + quantity);
                inventoryBatchRepository.save(latestBatch);

                inventoryTransactionRepository.save(InventoryTransactionEntity.builder()
                        .product(product)
                        .batch(latestBatch)
                        .quantity(quantity)
                        .type("IMPORT")
                        .note("Hoàn trả tồn kho từ Đơn hàng hủy")
                        .build());
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

    private CouponCalculation calculateCoupon(String couponCode, BigDecimal subtotal, BigDecimal baseShippingFee, List<CheckoutItem> checkoutItems, UserEntity user) {
        String cleanCouponCode = cleanBlank(couponCode);

        if (cleanCouponCode == null) {
            return new CouponCalculation(
                    null,
                    null,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    baseShippingFee
            );
        }

        List<String> codes = parseCouponCodes(cleanCouponCode);

        if (codes.isEmpty()) {
            return new CouponCalculation(
                    null,
                    null,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    baseShippingFee
            );
        }

        BigDecimal totalDiscount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal currentShippingFee = baseShippingFee;
        CouponEntity primaryCoupon = null;
        List<String> validCodes = new java.util.ArrayList<>();

        boolean hasOrderDiscount = false;
        boolean hasFreeship = false;
        java.util.Set<Long> discountedProductIds = new java.util.HashSet<>();

        for (String code : codes) {
            CouponEntity coupon = couponRepository.findByCodeIgnoreCaseForUpdate(code)
                    .orElseThrow(() -> new BadRequestException("Mã giảm giá '" + code + "' không tồn tại"));

            String type = normalizeCouponType(coupon);
            if (COUPON_TYPE_FREESHIP.equals(type)) {
                if (hasFreeship) {
                    throw new BadRequestException("Chỉ được áp dụng tối đa 1 mã miễn phí vận chuyển");
                }
                hasFreeship = true;
            } else if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(type)) {
                if (coupon.getProductId() != null) {
                    if (discountedProductIds.contains(coupon.getProductId())) {
                        throw new BadRequestException("Sản phẩm này đã được áp dụng mã giảm giá");
                    }
                    discountedProductIds.add(coupon.getProductId());
                }
            } else {
                if (hasOrderDiscount) {
                    throw new BadRequestException("Chỉ được áp dụng tối đa 1 mã giảm giá đơn hàng");
                }
                hasOrderDiscount = true;
            }

            validateCoupon(coupon, subtotal, checkoutItems, user);

            BigDecimal discountAmount = calculateDiscountAmount(coupon, subtotal, checkoutItems);
            totalDiscount = totalDiscount.add(discountAmount);

            if (COUPON_TYPE_FREESHIP.equals(type)) {
                currentShippingFee = calculateShippingFee(coupon, baseShippingFee);
            }

            coupon.setTimesUsed((coupon.getTimesUsed() == null ? 0 : coupon.getTimesUsed()) + 1);
            couponRepository.save(coupon);

            validCodes.add(coupon.getCode());
            if (primaryCoupon == null || COUPON_TYPE_ORDER_DISCOUNT.equals(type)) {
                primaryCoupon = coupon;
            }
        }

        String combinedCode = String.join(",", validCodes);
        return new CouponCalculation(primaryCoupon, combinedCode, totalDiscount, currentShippingFee);
    }

    private CouponPreviewCalculation calculateCouponPreview(String couponCode, BigDecimal subtotal, BigDecimal baseShippingFee, List<CheckoutItem> checkoutItems, UserEntity user) {
        String cleanCouponCode = cleanBlank(couponCode);

        if (cleanCouponCode == null) {
            return new CouponPreviewCalculation(
                    null,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    baseShippingFee,
                    false,
                    true,
                    "No coupon applied"
            );
        }

        List<String> codes = parseCouponCodes(cleanCouponCode);

        if (codes.isEmpty()) {
            return new CouponPreviewCalculation(
                    null,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    baseShippingFee,
                    false,
                    true,
                    "No coupon applied"
            );
        }

        BigDecimal totalDiscount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal currentShippingFee = baseShippingFee;
        List<String> validCodes = new java.util.ArrayList<>();

        boolean hasOrderDiscount = false;
        boolean hasFreeship = false;
        java.util.Set<Long> discountedProductIds = new java.util.HashSet<>();

        for (String code : codes) {
            Optional<CouponEntity> couponOptional = couponRepository.findByCodeIgnoreCase(code);
            if (couponOptional.isEmpty()) {
                return invalidCouponPreview(code, "Mã giảm giá '" + code + "' không tồn tại", baseShippingFee);
            }

            CouponEntity coupon = couponOptional.get();

            String type = normalizeCouponType(coupon);
            if (COUPON_TYPE_FREESHIP.equals(type)) {
                if (hasFreeship) {
                    return invalidCouponPreview(code, "Chỉ được áp dụng tối đa 1 mã miễn phí vận chuyển", baseShippingFee);
                }
                hasFreeship = true;
            } else if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(type)) {
                if (coupon.getProductId() != null) {
                    if (discountedProductIds.contains(coupon.getProductId())) {
                        return invalidCouponPreview(code, "Sản phẩm này đã được áp dụng mã giảm giá", baseShippingFee);
                    }
                    discountedProductIds.add(coupon.getProductId());
                }
            } else {
                if (hasOrderDiscount) {
                    return invalidCouponPreview(code, "Chỉ được áp dụng tối đa 1 mã giảm giá đơn hàng", baseShippingFee);
                }
                hasOrderDiscount = true;
            }

            String invalidMessage = getCouponInvalidMessage(coupon, subtotal, checkoutItems, user);
            if (invalidMessage != null) {
                return invalidCouponPreview(coupon.getCode(), invalidMessage, baseShippingFee);
            }

            BigDecimal discountAmount = calculateDiscountAmount(coupon, subtotal, checkoutItems);
            totalDiscount = totalDiscount.add(discountAmount);

            if (COUPON_TYPE_FREESHIP.equals(type)) {
                currentShippingFee = calculateShippingFee(coupon, baseShippingFee);
            }

            validCodes.add(coupon.getCode());
        }

        String combinedCode = String.join(",", validCodes);
        return new CouponPreviewCalculation(
                combinedCode,
                totalDiscount,
                currentShippingFee,
                true,
                true,
                "Áp dụng thành công các mã giảm giá"
        );
    }

    private CouponPreviewCalculation invalidCouponPreview(String couponCode, String message, BigDecimal baseShippingFee) {
        return new CouponPreviewCalculation(
                couponCode,
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                baseShippingFee,
                false,
                false,
                message
        );
    }

    private BigDecimal calculateDiscountAmount(CouponEntity coupon, BigDecimal subtotal, List<CheckoutItem> checkoutItems) {
        if (COUPON_TYPE_FREESHIP.equals(normalizeCouponType(coupon))) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal eligibleAmount = subtotal;
        if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(normalizeCouponType(coupon)) && coupon.getProductId() != null) {
            eligibleAmount = checkoutItems.stream()
                    .filter(item -> item.product().getId().equals(coupon.getProductId()))
                    .map(CheckoutItem::lineTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal discountAmount;
        if (DISCOUNT_TYPE_FIXED_AMOUNT.equals(normalizeDiscountType(coupon))) {
            discountAmount = coupon.getDiscountAmount() == null ? BigDecimal.ZERO : coupon.getDiscountAmount();
        } else {
            discountAmount = eligibleAmount
                    .multiply(BigDecimal.valueOf(coupon.getDiscountPercentage()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        // Áp dụng giới hạn số tiền được giảm tối đa cho mã voucher đặc quyền theo hạng thành viên
        // Đồng: giảm tối đa 10% của 500k = 50k
        // Bạc: giảm tối đa 10% của 1M = 100k
        // Vàng: giảm tối đa 10% của 2.5M = 250k
        // Kim Cương: giảm tối đa 10% của 4M = 400k
        String code = coupon.getCode().trim().toUpperCase();
        BigDecimal maxCap = null;
        if ("BRONZE5".equals(code)) {
            maxCap = new BigDecimal("50000.00");
        } else if ("SILVER10".equals(code)) {
            maxCap = new BigDecimal("100000.00");
        } else if ("GOLD25".equals(code)) {
            maxCap = new BigDecimal("250000.00");
        } else if ("PLATINUM50".equals(code)) {
            maxCap = new BigDecimal("400000.00");
        }

        if (maxCap != null && discountAmount.compareTo(maxCap) > 0) {
            discountAmount = maxCap;
        }

        if (discountAmount.compareTo(eligibleAmount) > 0) {
            discountAmount = eligibleAmount;
        }

        return discountAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateShippingFee(CouponEntity coupon, BigDecimal baseShippingFee) {
        if (COUPON_TYPE_FREESHIP.equals(normalizeCouponType(coupon))) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return normalizeMoney(baseShippingFee);
    }

    private BigDecimal calculateBaseShippingFee(ShippingAddressEntity shippingAddress, int totalQuantity) {
        if (shippingAddress == null || totalQuantity <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal shippingFee = shippingCarrierService.calculateShippingFee(
                shippingAddress.getCity(),
                getAddressSegmentFromEnd(shippingAddress.getAddress(), 1),
                getAddressSegmentFromEnd(shippingAddress.getAddress(), 2),
                Math.max(totalQuantity, 1) * DEFAULT_ITEM_WEIGHT_GRAMS
        );

        if (shippingFee == null || shippingFee.compareTo(BigDecimal.ZERO) < 0) {
            return DEFAULT_SHIPPING_FEE;
        }

        return normalizeMoney(shippingFee);
    }

    private BigDecimal normalizeMoney(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private int calculateRedeemablePoints(CheckoutRequest request, UserEntity user, BigDecimal subtotal) {
        if (!Boolean.TRUE.equals(request.getUsePoints()) || subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }

        int userPoints = Math.max(user.getLoyaltyPoints() == null ? 0 : user.getLoyaltyPoints(), 0);
        if (userPoints <= 0) {
            return 0;
        }

        int maxAllowed = subtotal.multiply(new BigDecimal("0.20"))
                .setScale(0, RoundingMode.DOWN)
                .intValue();
        return Math.min(userPoints, maxAllowed);
    }

    private BigDecimal pointsToMoney(int points) {
        if (points <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return BigDecimal.valueOf(points).setScale(2, RoundingMode.HALF_UP);
    }

    private String getAddressSegmentFromEnd(String address, int offsetFromEnd) {
        if (address == null || address.trim().isEmpty()) {
            return null;
        }

        String[] parts = address.split(",");
        int index = parts.length - offsetFromEnd;
        if (index < 0 || index >= parts.length) {
            return null;
        }

        String segment = parts[index].trim();
        return segment.isEmpty() ? null : segment;
    }

    private String normalizeCouponType(CouponEntity coupon) {
        String couponType = cleanBlank(coupon.getCouponType());
        return couponType == null ? COUPON_TYPE_ORDER_DISCOUNT : couponType.toUpperCase(Locale.ROOT);
    }

    private String normalizeDiscountType(CouponEntity coupon) {
        String discountType = cleanBlank(coupon.getDiscountType());
        return discountType == null ? "PERCENTAGE" : discountType.toUpperCase(Locale.ROOT);
    }

    private void validateCoupon(CouponEntity coupon, BigDecimal subtotal, List<CheckoutItem> checkoutItems, UserEntity user) {
        if (!Boolean.TRUE.equals(coupon.getActive())) {
            throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
        }

        if (!loyaltyService.validateTierCoupon(user, coupon.getCode())) {
            throw new BadRequestException("Hạng thành viên của bạn không đủ điều kiện sử dụng mã giảm giá này");
        }

        // Đồng bộ múi giờ UTC+7 cho thời gian hiện tại
        LocalDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();

        if (coupon.getStartsAt() != null && coupon.getStartsAt().isAfter(now)) {
            throw new BadRequestException("Coupon has not started");
        }

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Mã giảm giá đã hết hạn");
        }

        if (coupon.getUsageLimit() != null && coupon.getTimesUsed() != null && coupon.getTimesUsed() >= coupon.getUsageLimit()) {
            throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
        }

        if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(normalizeCouponType(coupon))) {
            if (coupon.getProductId() == null) {
                throw new BadRequestException("Mã giảm giá sản phẩm không hợp lệ");
            }
            boolean hasProduct = checkoutItems.stream()
                    .anyMatch(item -> item.product().getId().equals(coupon.getProductId()));
            if (!hasProduct) {
                throw new BadRequestException("Đơn hàng không chứa sản phẩm được áp dụng mã giảm giá này");
            }
        }

        if (coupon.getMinOrderValue() != null && subtotal != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu " + coupon.getMinOrderValue().longValue() + "đ để áp dụng mã này");
        }

        if (COUPON_TYPE_FREESHIP.equals(normalizeCouponType(coupon))) {
            return;
        }

        if (DISCOUNT_TYPE_FIXED_AMOUNT.equals(normalizeDiscountType(coupon))
                && (coupon.getDiscountAmount() == null || coupon.getDiscountAmount().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new BadRequestException("Coupon discount is invalid");
        }

        if (DISCOUNT_TYPE_FIXED_AMOUNT.equals(normalizeDiscountType(coupon))) {
            return;
        }

        if (coupon.getDiscountPercentage() == null || coupon.getDiscountPercentage() <= 0 || coupon.getDiscountPercentage() > 100) {
            throw new BadRequestException("Mã giảm giá không hợp lệ");
        }
    }

    private String getCouponInvalidMessage(CouponEntity coupon, BigDecimal subtotal, List<CheckoutItem> checkoutItems, UserEntity user) {
        if (!Boolean.TRUE.equals(coupon.getActive())) {
            return "Coupon is inactive";
        }

        if (!loyaltyService.validateTierCoupon(user, coupon.getCode())) {
            return "Hạng thành viên của bạn không đủ điều kiện sử dụng mã giảm giá này";
        }

        // Đồng bộ múi giờ UTC+7 cho thời gian hiện tại
        LocalDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();

        if (coupon.getStartsAt() != null && coupon.getStartsAt().isAfter(now)) {
            return "Coupon has not started";
        }

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(now)) {
            return "Coupon has expired";
        }

        if (coupon.getUsageLimit() != null && coupon.getTimesUsed() != null && coupon.getTimesUsed() >= coupon.getUsageLimit()) {
            return "Coupon usage limit has been reached";
        }

        if (COUPON_TYPE_PRODUCT_DISCOUNT.equals(normalizeCouponType(coupon))) {
            if (coupon.getProductId() == null) {
                return "Mã giảm giá sản phẩm không hợp lệ";
            }
            boolean hasProduct = checkoutItems.stream()
                    .anyMatch(item -> item.product().getId().equals(coupon.getProductId()));
            if (!hasProduct) {
                return "Đơn hàng không chứa sản phẩm áp dụng mã này";
            }
        }

        if (coupon.getMinOrderValue() != null && subtotal != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            return "Đơn hàng tối thiểu phải từ " + coupon.getMinOrderValue().longValue() + "đ";
        }

        if (COUPON_TYPE_FREESHIP.equals(normalizeCouponType(coupon))) {
            return null;
        }

        if (DISCOUNT_TYPE_FIXED_AMOUNT.equals(normalizeDiscountType(coupon))
                && (coupon.getDiscountAmount() == null || coupon.getDiscountAmount().compareTo(BigDecimal.ZERO) <= 0)) {
            return "Coupon discount is invalid";
        }

        if (DISCOUNT_TYPE_FIXED_AMOUNT.equals(normalizeDiscountType(coupon))) {
            return null;
        }

        if (coupon.getDiscountPercentage() == null || coupon.getDiscountPercentage() <= 0 || coupon.getDiscountPercentage() > 100) {
            return "Coupon discount is invalid";
        }

        return null;
    }

    private List<String> buildCheckoutPreviewWarnings(
            List<CheckoutPreviewItemResponse> items,
            CouponPreviewCalculation couponCalculation
    ) {
        List<String> warnings = new ArrayList<>();
        items.stream()
                .filter(item -> !item.isAvailable())
                .map(item -> item.getProductName() == null
                        ? item.getMessage()
                        : item.getProductName() + ": " + item.getMessage())
                .forEach(warnings::add);

        if (!couponCalculation.checkoutAllowed()) {
            warnings.add(couponCalculation.message());
        }

        return warnings;
    }

    private void releaseCouponUsage(OrderEntity order) {
        List<String> couponCodes = parseCouponCodes(order.getCouponCode());

        if (couponCodes.isEmpty() && order.getCoupon() != null && cleanBlank(order.getCoupon().getCode()) != null) {
            couponCodes = List.of(order.getCoupon().getCode().trim());
        }

        if (couponCodes.isEmpty()) {
            return;
        }

        couponCodes.stream()
                .map(couponRepository::findByCodeIgnoreCase)
                .flatMap(Optional::stream)
                .forEach(coupon -> {
                    int timesUsed = coupon.getTimesUsed() == null ? 0 : coupon.getTimesUsed();
                    if (timesUsed > 0) {
                        coupon.setTimesUsed(timesUsed - 1);
                        couponRepository.save(coupon);
                    }
                });
    }

    private OrderStatusHistoryEntity createStatusHistory(OrderEntity order, String status, String note) {
        return OrderStatusHistoryEntity.builder()
                .order(order)
                .status(status)
                .changedAt(LocalDateTime.now())
                .note(note)
                .build();
    }

    private String normalizePaymentMethod(String paymentMethod) {
        String normalizedPaymentMethod = cleanBlank(paymentMethod);
        if (normalizedPaymentMethod == null) {
            throw new BadRequestException("Phương thức thanh toán không được để trống");
        }

        normalizedPaymentMethod = normalizedPaymentMethod.toLowerCase(Locale.ROOT);
        if (!ALLOWED_PAYMENT_METHODS.contains(normalizedPaymentMethod)) {
            throw new BadRequestException("Phương thức thanh toán không hợp lệ. Giá trị hợp lệ: cash, paypal, vnpay");
        }

        return normalizedPaymentMethod;
    }

    private void validateVnpayConfigurationIfNeeded(String paymentMethod) {
        if (!PAYMENT_METHOD_VNPAY.equals(paymentMethod)) {
            return;
        }

        if (cleanBlank(vnpayProperties.getPayUrl()) == null
                || cleanBlank(vnpayProperties.getTmnCode()) == null
                || cleanBlank(vnpayProperties.getHashSecret()) == null
                || cleanBlank(vnpayProperties.getReturnUrl()) == null) {
            throw new BadRequestException("VNPay chưa được cấu hình. Vui lòng thiết lập VNPAY_TMN_CODE và VNPAY_HASH_SECRET trong agri-ecommerce-backend/.env rồi khởi động lại backend");
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

    private OrderEntity findOrderByIdAndUserId(Long orderId, Long userId) {
        return orderRepository.findByIdAndUser_Id(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với id: " + orderId));
    }

    private OrderEntity findOrderByIdAndUserIdForUpdate(Long orderId, Long userId) {
        return orderRepository.findByIdAndUserIdForUpdate(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với id: " + orderId));
    }

    private ShippingAddressEntity findShippingAddressByIdAndUserId(Long addressId, Long userId) {
        return shippingAddressRepository.findByIdAndUser_Id(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ giao hàng với id: " + addressId));
    }

    private UserEntity findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + userId));
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }

        return value.trim();
    }

    private List<String> parseCouponCodes(String couponCode) {
        String cleanCouponCode = cleanBlank(couponCode);
        if (cleanCouponCode == null) {
            return List.of();
        }

        Map<String, String> uniqueCodes = new LinkedHashMap<>();
        java.util.Arrays.stream(cleanCouponCode.split(","))
                .map(String::trim)
                .filter(code -> !code.isEmpty())
                .forEach(code -> uniqueCodes.putIfAbsent(code.toUpperCase(Locale.ROOT), code));

        return List.copyOf(uniqueCodes.values());
    }

    private record CheckoutItem(ProductEntity product, int quantity, BigDecimal price, BigDecimal lineTotal) {
    }

    private record CouponCalculation(
            CouponEntity coupon,
            String couponCode,
            BigDecimal discountAmount,
            BigDecimal shippingFee
    ) {
    }

    private record CouponPreviewCalculation(
            String couponCode,
            BigDecimal discountAmount,
            BigDecimal shippingFee,
            boolean valid,
            boolean checkoutAllowed,
            String message
    ) {
    }
}
