package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.entity.*;
import com.agri.ecommerce.exception.BadRequestException;
import com.agri.ecommerce.exception.ResourceNotFoundException;
import com.agri.ecommerce.mapper.OrderMapper;
import com.agri.ecommerce.repository.*;
import com.agri.ecommerce.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final String IN_STOCK_STATUS = "in_stock";
    private static final String OUT_OF_STOCK_STATUS = "out_of_stock";
    private static final String ORDER_PENDING = "pending";
    private static final String ORDER_DELIVERED = "delivered";
    private static final String ORDER_COMPLETED = "completed";
    private static final String ORDER_CANCELED = "canceled";
    private static final String PAYMENT_PENDING = "pending";
    private static final String PAYMENT_COMPLETED = "completed";
    private static final String PAYMENT_FAILED = "failed";
    private static final BigDecimal DEFAULT_SHIPPING_FEE = new BigDecimal("25000.00");
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_PAYMENT_METHODS = Set.of("cash", "paypal");
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

    private final OrderMapper orderMapper;

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
    @Transactional
    public OrderResponse checkout(Long userId, CheckoutRequest request) {
        UserEntity user = findUserById(userId);
        ShippingAddressEntity shippingAddress = findShippingAddressByIdAndUserId(request.getShippingAddressId(), userId);
        String paymentMethod = normalizePaymentMethod(request.getPaymentMethod());
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
        CouponCalculation couponCalculation = calculateCoupon(request.getCouponCode(), subtotal);
        BigDecimal totalPrice = subtotal
                .subtract(couponCalculation.discountAmount())
                .add(DEFAULT_SHIPPING_FEE)
                .setScale(2, RoundingMode.HALF_UP);

        OrderEntity order = orderRepository.save(OrderEntity.builder()
                .user(user)
                .shippingAddress(shippingAddress)
                .subtotal(subtotal)
                .discountAmount(couponCalculation.discountAmount())
                .shippingFee(DEFAULT_SHIPPING_FEE)
                .coupon(couponCalculation.coupon())
                .couponCode(couponCalculation.couponCode())
                .totalPrice(totalPrice)
                .status(ORDER_PENDING)
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

        OrderStatusHistoryEntity history = orderStatusHistoryRepository.save(createStatusHistory(
                order,
                ORDER_PENDING,
                "Customer created order"
        ));

        checkoutItems.forEach(this::decreaseProductStock);
        productRepository.saveAll(checkoutItems.stream().map(CheckoutItem::product).toList());
        cartItemRepository.deleteByUser_Id(userId);

        return orderMapper.toOrderResponse(order, savedOrderItems, payment, List.of(history));
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long userId, Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findOrderByIdAndUserId(orderId, userId);

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

        if (payment != null && PAYMENT_PENDING.equals(payment.getStatus())) {
            payment.setStatus(PAYMENT_FAILED);
            paymentRepository.save(payment);
        }

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                ORDER_CANCELED,
                cleanBlank(request == null ? null : request.getNote())
        ));

        return toOrderResponse(savedOrder, true);
    }

    @Override
    @Transactional
    public OrderResponse completeOrder(Long userId, Long orderId, OrderStatusNoteRequest request) {
        OrderEntity order = findOrderByIdAndUserId(orderId, userId);

        if (!ORDER_DELIVERED.equals(order.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận hoàn tất đơn hàng đã giao");
        }

        order.setStatus(ORDER_COMPLETED);
        OrderEntity savedOrder = orderRepository.save(order);
        PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(orderId).orElse(null);

        if (payment != null && PAYMENT_PENDING.equals(payment.getStatus())) {
            payment.setStatus(PAYMENT_COMPLETED);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);
        }

        orderStatusHistoryRepository.save(createStatusHistory(
                savedOrder,
                ORDER_COMPLETED,
                cleanBlank(request == null ? null : request.getNote())
        ));

        return toOrderResponse(savedOrder, true);
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
        int remainingStock = product.getStock() - checkoutItem.quantity();
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

            int currentStock = product.getStock() == null ? 0 : product.getStock();
            int restoredStock = currentStock + quantity;
            product.setStock(restoredStock);

            if (restoredStock > 0 && OUT_OF_STOCK_STATUS.equals(product.getStatus())) {
                product.setStatus(IN_STOCK_STATUS);
            }
        });

        productRepository.saveAll(productsById.values());
    }

    private CouponCalculation calculateCoupon(String couponCode, BigDecimal subtotal) {
        String cleanCouponCode = cleanBlank(couponCode);

        if (cleanCouponCode == null) {
            return new CouponCalculation(null, null, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }

        CouponEntity coupon = couponRepository.findByCodeIgnoreCaseForUpdate(cleanCouponCode)
                .orElseThrow(() -> new BadRequestException("Mã giảm giá không tồn tại"));
        validateCoupon(coupon);

        BigDecimal discountAmount = subtotal
                .multiply(BigDecimal.valueOf(coupon.getDiscountPercentage()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        if (discountAmount.compareTo(subtotal) > 0) {
            discountAmount = subtotal;
        }

        coupon.setTimesUsed((coupon.getTimesUsed() == null ? 0 : coupon.getTimesUsed()) + 1);
        couponRepository.save(coupon);

        return new CouponCalculation(coupon, coupon.getCode(), discountAmount);
    }

    private void validateCoupon(CouponEntity coupon) {
        if (!Boolean.TRUE.equals(coupon.getActive())) {
            throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
        }

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã giảm giá đã hết hạn");
        }

        if (coupon.getUsageLimit() != null && coupon.getTimesUsed() != null && coupon.getTimesUsed() >= coupon.getUsageLimit()) {
            throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
        }

        if (coupon.getDiscountPercentage() == null || coupon.getDiscountPercentage() < 0 || coupon.getDiscountPercentage() > 100) {
            throw new BadRequestException("Mã giảm giá không hợp lệ");
        }
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
            throw new BadRequestException("Phương thức thanh toán không hợp lệ. Giá trị hợp lệ: cash, paypal");
        }

        return normalizedPaymentMethod;
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

    private record CheckoutItem(ProductEntity product, int quantity, BigDecimal price, BigDecimal lineTotal) {
    }

    private record CouponCalculation(CouponEntity coupon, String couponCode, BigDecimal discountAmount) {
    }
}
