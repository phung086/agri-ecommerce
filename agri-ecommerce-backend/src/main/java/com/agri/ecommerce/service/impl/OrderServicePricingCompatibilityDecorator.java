package com.agri.ecommerce.service.impl;

import com.agri.ecommerce.dto.request.order.CheckoutRequest;
import com.agri.ecommerce.dto.request.order.OrderStatusNoteRequest;
import com.agri.ecommerce.dto.response.common.PageResponse;
import com.agri.ecommerce.dto.response.order.CheckoutPreviewResponse;
import com.agri.ecommerce.dto.response.order.OrderResponse;
import com.agri.ecommerce.dto.response.order.ShippingAddressResponse;
import com.agri.ecommerce.entity.CouponEntity;
import com.agri.ecommerce.entity.OrderEntity;
import com.agri.ecommerce.entity.OrderItemEntity;
import com.agri.ecommerce.entity.PaymentEntity;
import com.agri.ecommerce.repository.CouponRepository;
import com.agri.ecommerce.repository.OrderItemRepository;
import com.agri.ecommerce.repository.OrderRepository;
import com.agri.ecommerce.repository.PaymentRepository;
import com.agri.ecommerce.service.OrderService;
import com.agri.ecommerce.service.ShippingCarrierService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Slf4j
@Primary
@Service
public class OrderServicePricingCompatibilityDecorator implements OrderService {

    private static final String COUPON_TYPE_FREESHIP = "FREESHIP";
    private static final String DISCOUNT_TYPE_FIXED_AMOUNT = "FIXED_AMOUNT";
    private static final BigDecimal DEFAULT_SHIP20K_AMOUNT = new BigDecimal("20000.00");
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final double DEFAULT_ITEM_WEIGHT_GRAMS = 500.0d;

    private final OrderService delegate;
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final ShippingCarrierService shippingCarrierService;

    public OrderServicePricingCompatibilityDecorator(
            @Qualifier("orderServiceImpl") OrderService delegate,
            CouponRepository couponRepository,
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            PaymentRepository paymentRepository,
            ShippingCarrierService shippingCarrierService
    ) {
        this.delegate = delegate;
        this.couponRepository = couponRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
        this.shippingCarrierService = shippingCarrierService;
    }

    @Override
    public PageResponse<OrderResponse> getOrders(Long userId, int page, int size, String sort) {
        return delegate.getOrders(userId, page, size, sort);
    }

    @Override
    public OrderResponse getOrder(Long userId, Long orderId) {
        return delegate.getOrder(userId, orderId);
    }

    @Override
    public CheckoutPreviewResponse previewCheckout(Long userId, CheckoutRequest request) {
        CheckoutPreviewResponse response = delegate.previewCheckout(userId, request);
        return normalizePreviewPricing(response, request == null ? null : request.getCouponCode());
    }

    @Override
    @Transactional
    public OrderResponse checkout(Long userId, CheckoutRequest request) {
        OrderResponse response = delegate.checkout(userId, request);
        return normalizePersistedOrderPricing(response, request == null ? null : request.getCouponCode());
    }

    @Override
    public CheckoutPreviewResponse previewGuestCheckout(CheckoutRequest request) {
        return delegate.previewGuestCheckout(request);
    }

    @Override
    public OrderResponse guestCheckout(CheckoutRequest request) {
        return delegate.guestCheckout(request);
    }

    @Override
    public OrderResponse cancelOrder(Long userId, Long orderId, OrderStatusNoteRequest request) {
        return delegate.cancelOrder(userId, orderId, request);
    }

    @Override
    public OrderResponse completeOrder(Long userId, Long orderId, OrderStatusNoteRequest request) {
        return delegate.completeOrder(userId, orderId, request);
    }

    @Override
    public OrderResponse trackOrder(Long orderId, String phone) {
        return delegate.trackOrder(orderId, phone);
    }

    @Override
    public OrderResponse trackOrderByGhnCode(String trackingCode, String phone) {
        return delegate.trackOrderByGhnCode(trackingCode, phone);
    }

    private CheckoutPreviewResponse normalizePreviewPricing(CheckoutPreviewResponse response, String requestedCouponCode) {
        if (response == null) {
            return null;
        }

        BigDecimal subtotal = money(response.getSubtotal());
        BigDecimal discount = money(response.getDiscountAmount());
        BigDecimal baseShippingFee = calculatePreviewBaseShippingFee(response);
        BigDecimal shippingFee = applyShippingCoupons(resolveCouponCodes(requestedCouponCode, response.getCouponCode()), baseShippingFee);
        BigDecimal totalPrice = subtotal.subtract(discount).add(shippingFee).setScale(2, RoundingMode.HALF_UP);
        if (totalPrice.compareTo(ZERO) < 0) {
            totalPrice = ZERO;
        }

        response.setShippingFee(shippingFee);
        response.setTotalPrice(totalPrice);
        response.setWarnings(removeHardcodedShippingWarnings(response.getWarnings()));
        return response;
    }

    private OrderResponse normalizePersistedOrderPricing(OrderResponse response, String requestedCouponCode) {
        if (response == null || response.getId() == null) {
            return response;
        }

        try {
            OrderEntity order = orderRepository.findByIdForUpdate(response.getId()).orElse(null);
            if (order == null) {
                return response;
            }

            List<OrderItemEntity> items = orderItemRepository.findByOrder_IdOrderByIdAsc(order.getId());
            int quantity = items.stream()
                    .map(OrderItemEntity::getQuantity)
                    .filter(value -> value != null && value > 0)
                    .mapToInt(Integer::intValue)
                    .sum();

            BigDecimal subtotal = money(order.getSubtotal());
            BigDecimal discount = money(order.getDiscountAmount());
            BigDecimal baseShippingFee = calculateBaseShippingFee(order.getShippingCity(), order.getShippingAddressDetail(), quantity);
            BigDecimal shippingFee = applyShippingCoupons(resolveCouponCodes(requestedCouponCode, order.getCouponCode()), baseShippingFee);
            BigDecimal totalPrice = subtotal.subtract(discount).add(shippingFee).setScale(2, RoundingMode.HALF_UP);
            if (totalPrice.compareTo(ZERO) < 0) {
                totalPrice = ZERO;
            }

            order.setShippingFee(shippingFee);
            order.setTotalPrice(totalPrice);
            orderRepository.save(order);

            PaymentEntity payment = paymentRepository.findFirstByOrder_IdOrderByCreatedAtDesc(order.getId()).orElse(null);
            if (payment != null) {
                payment.setAmount(totalPrice);
                paymentRepository.save(payment);
            }

            response.setShippingFee(shippingFee);
            response.setTotalPrice(totalPrice);
            if (response.getPayment() != null) {
                response.getPayment().setAmount(totalPrice);
            }
        } catch (Exception ex) {
            log.warn("[Order pricing compatibility] Could not normalize order #{} pricing: {}", response.getId(), ex.getMessage());
        }

        return response;
    }

    private BigDecimal calculatePreviewBaseShippingFee(CheckoutPreviewResponse response) {
        ShippingAddressResponse address = response.getShippingAddress();
        int quantity = response.getTotalQuantity() == null ? 0 : response.getTotalQuantity();
        BigDecimal calculated = calculateBaseShippingFee(
                address == null ? null : address.getCity(),
                address == null ? null : address.getAddress(),
                quantity
        );

        if (calculated.compareTo(ZERO) > 0) {
            return calculated;
        }

        return restoreDiscountedShippingFallback(response.getSubtotal(), response.getShippingFee());
    }

    private BigDecimal calculateBaseShippingFee(String city, String address, int quantity) {
        if (quantity <= 0) {
            return ZERO;
        }

        try {
            BigDecimal fee = shippingCarrierService.calculateShippingFee(
                    city,
                    getAddressSegmentFromEnd(address, 1),
                    getAddressSegmentFromEnd(address, 2),
                    Math.max(quantity, 1) * DEFAULT_ITEM_WEIGHT_GRAMS
            );
            if (fee != null && fee.compareTo(ZERO) >= 0) {
                return money(fee);
            }
        } catch (Exception ex) {
            log.warn("[Order pricing compatibility] Could not calculate base shipping fee: {}", ex.getMessage());
        }

        return ZERO;
    }

    private BigDecimal restoreDiscountedShippingFallback(BigDecimal subtotal, BigDecimal currentShippingFee) {
        BigDecimal fee = money(currentShippingFee);
        BigDecimal safeSubtotal = money(subtotal);
        if (safeSubtotal.compareTo(new BigDecimal("100000.00")) >= 0
                && safeSubtotal.compareTo(new BigDecimal("300000.00")) < 0) {
            return fee.add(DEFAULT_SHIP20K_AMOUNT).setScale(2, RoundingMode.HALF_UP);
        }
        return fee;
    }

    private BigDecimal applyShippingCoupons(String couponCode, BigDecimal baseShippingFee) {
        BigDecimal shippingFee = money(baseShippingFee);
        for (String code : parseCouponCodes(couponCode)) {
            CouponEntity coupon = couponRepository.findByCodeIgnoreCase(code).orElse(null);
            if (coupon == null || !isFreeshipCoupon(coupon)) {
                continue;
            }
            shippingFee = applyShippingCoupon(coupon, shippingFee);
        }
        return shippingFee;
    }

    private BigDecimal applyShippingCoupon(CouponEntity coupon, BigDecimal currentShippingFee) {
        BigDecimal fee = money(currentShippingFee);
        if (fee.compareTo(ZERO) <= 0) {
            return ZERO;
        }

        BigDecimal fixedAmount = resolveFixedShippingDiscount(coupon);
        if (fixedAmount.compareTo(ZERO) > 0) {
            return fee.subtract(fixedAmount.min(fee)).setScale(2, RoundingMode.HALF_UP);
        }

        Integer percentage = coupon.getDiscountPercentage();
        if (percentage != null && percentage > 0) {
            BigDecimal discount = fee.multiply(BigDecimal.valueOf(Math.min(percentage, 100)))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            return fee.subtract(discount.min(fee)).setScale(2, RoundingMode.HALF_UP);
        }

        return ZERO;
    }

    private BigDecimal resolveFixedShippingDiscount(CouponEntity coupon) {
        if (coupon == null) {
            return ZERO;
        }

        BigDecimal amount = money(coupon.getDiscountAmount());
        if (amount.compareTo(ZERO) > 0) {
            return amount;
        }

        String code = coupon.getCode() == null ? "" : coupon.getCode().trim().toUpperCase(Locale.ROOT);
        if ("SHIP20K".equals(code)) {
            return DEFAULT_SHIP20K_AMOUNT;
        }

        return ZERO;
    }

    private boolean isFreeshipCoupon(CouponEntity coupon) {
        String type = coupon.getCouponType() == null ? "" : coupon.getCouponType().trim().toUpperCase(Locale.ROOT);
        return COUPON_TYPE_FREESHIP.equals(type);
    }

    private String resolveCouponCodes(String requestedCouponCode, String responseCouponCode) {
        String requested = cleanBlank(requestedCouponCode);
        return requested != null ? requested : cleanBlank(responseCouponCode);
    }

    private List<String> parseCouponCodes(String couponCode) {
        String clean = cleanBlank(couponCode);
        if (clean == null) {
            return List.of();
        }
        return Arrays.stream(clean.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private List<String> removeHardcodedShippingWarnings(List<String> warnings) {
        if (warnings == null || warnings.isEmpty()) {
            return warnings;
        }
        List<String> result = new ArrayList<>();
        for (String warning : warnings) {
            String text = warning == null ? "" : warning;
            if (text.contains("Đơn hàng từ 100.000đ được giảm 20.000đ phí vận chuyển")
                    || text.contains("Đơn hàng từ 300.000đ được miễn phí vận chuyển")) {
                continue;
            }
            result.add(warning);
        }
        return result;
    }

    private String getAddressSegmentFromEnd(String address, int positionFromEnd) {
        String clean = cleanBlank(address);
        if (clean == null) {
            return "";
        }
        String[] parts = clean.split(",");
        int index = parts.length - positionFromEnd;
        if (index < 0 || index >= parts.length) {
            return "";
        }
        return parts[index].trim();
    }

    private BigDecimal money(BigDecimal value) {
        if (value == null) {
            return ZERO;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String cleanBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }
}
